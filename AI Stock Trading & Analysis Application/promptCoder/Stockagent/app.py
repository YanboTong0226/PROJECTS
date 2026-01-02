# app.py
from flask import Flask, render_template, request, redirect, url_for, jsonify, Response # Added Response
import main as simulation_main
import util as default_util
import threading
import os
import traceback
import queue # For SSE communication
import json # For SSE data
import time # For SSE keep-alive

app = Flask(__name__)

if not os.path.exists("res"):
    try: os.makedirs("res")
    except OSError as e: print(f"Error creating directory res: {e}")

# --- Shared State for Simulation ---
simulation_status = "idle"
simulation_data = { # Used for polling endpoint
    "daily_agent_records": [],
    "error_message": "",
    "progress_message": ""
}
simulation_lock = threading.Lock()
simulation_thread = None
sse_event_queue = queue.Queue() # Queue FOR SSE events ONLY
# --- End Shared State ---

# Modified to accept and pass sse_q
def run_simulation_task(form_data_dict, results_container_arg, sse_q):
    global simulation_status

    # Clear SSE queue
    while not sse_q.empty():
        try: sse_q.get_nowait()
        except queue.Empty: break
    sse_q.put({"type": "status_update", "payload": {"status": "running", "progress_message": "Simulation initializing...", "error_message":""}})

    with simulation_lock:
        simulation_status = "running"
        results_container_arg.clear()
        results_container_arg["daily_agent_records"] = []
        results_container_arg["error_message"] = ""
        results_container_arg["progress_message"] = "Simulation initializing..."

    print("Simulation task started.")
    config = {}
    try:
        # --- Populate config (same as your provided app.py) ---
        config['GEMINI_API_KEY'] = form_data_dict.get('GEMINI_API_KEY', default_util.GEMINI_API_KEY)
        config['MODEL_NAME'] = form_data_dict.get('model_name', "gemini-2.5-flash-lite")
        config['AGENTS_NUM'] = int(form_data_dict.get('agents_num', default_util.AGENTS_NUM))
        config['TOTAL_DATE'] = int(form_data_dict.get('total_date', default_util.TOTAL_DATE))
        config['TOTAL_SESSION'] = int(form_data_dict.get('total_session', default_util.TOTAL_SESSION))
        config['STOCK_A_INITIAL_PRICE'] = float(form_data_dict.get('stock_a_initial_price', default_util.STOCK_A_INITIAL_PRICE))
        config['STOCK_B_INITIAL_PRICE'] = float(form_data_dict.get('stock_b_initial_price', default_util.STOCK_B_INITIAL_PRICE))
        config['MAX_INITIAL_PROPERTY'] = float(form_data_dict.get('max_initial_property', default_util.MAX_INITIAL_PROPERTY))
        config['MIN_INITIAL_PROPERTY'] = float(form_data_dict.get('min_initial_property', default_util.MIN_INITIAL_PROPERTY))
        loan_type_names_str = form_data_dict.get('loan_type_names', default_util.LOAN_TYPE[0] if default_util.LOAN_TYPE and len(default_util.LOAN_TYPE)>0 else "one-month") 
        config['LOAN_TYPE'] = [s.strip() for s in loan_type_names_str.split(',') if s.strip()] or list(default_util.LOAN_TYPE)
        loan_type_durations_str = form_data_dict.get('loan_type_durations', ",".join(map(str,default_util.LOAN_TYPE_DATE)) if default_util.LOAN_TYPE_DATE else "22")
        config['LOAN_TYPE_DATE'] = [int(s.strip()) for s in loan_type_durations_str.split(',') if s.strip()] or list(default_util.LOAN_TYPE_DATE)
        loan_rates_str = form_data_dict.get('loan_rates', ",".join(map(str,default_util.LOAN_RATE)) if default_util.LOAN_RATE else "0.027")
        config['LOAN_RATE'] = [float(s.strip()) for s in loan_rates_str.split(',') if s.strip()] or list(default_util.LOAN_RATE)
        repayment_days_str = form_data_dict.get('repayment_days', ",".join(map(str,default_util.REPAYMENT_DAYS)) if default_util.REPAYMENT_DAYS else "22,44,66")
        config['REPAYMENT_DAYS'] = [int(s.strip()) for s in repayment_days_str.split(',') if s.strip()] if repayment_days_str else list(default_util.REPAYMENT_DAYS)
        config['SEASONAL_DAYS'] = int(form_data_dict.get('seasonal_days', default_util.SEASONAL_DAYS))
        season_report_days_str = form_data_dict.get('season_report_days', ",".join(map(str,default_util.SEASON_REPORT_DAYS)) if default_util.SEASON_REPORT_DAYS else "12,78,144")
        config['SEASON_REPORT_DAYS'] = [int(s.strip()) for s in season_report_days_str.split(',') if s.strip()] if season_report_days_str else list(default_util.SEASON_REPORT_DAYS)
        config['FINANCIAL_REPORT_A'] = [
            form_data_dict.get('financial_report_a_q1', default_util.FINANCIAL_REPORT_A[0] if len(default_util.FINANCIAL_REPORT_A) > 0 else "Report A Q1 Default"),
            form_data_dict.get('financial_report_a_q2', default_util.FINANCIAL_REPORT_A[1] if len(default_util.FINANCIAL_REPORT_A) > 1 else "Report A Q2 Default"),
            form_data_dict.get('financial_report_a_q3', default_util.FINANCIAL_REPORT_A[2] if len(default_util.FINANCIAL_REPORT_A) > 2 else "Report A Q3 Default"), 
            form_data_dict.get('financial_report_a_q4', default_util.FINANCIAL_REPORT_A[3] if len(default_util.FINANCIAL_REPORT_A) > 3 else "Report A Q4 Default")]
        config['FINANCIAL_REPORT_B'] = [
            form_data_dict.get('financial_report_b_q1', default_util.FINANCIAL_REPORT_B[0] if len(default_util.FINANCIAL_REPORT_B) > 0 else "Report B Q1 Default"),
            form_data_dict.get('financial_report_b_q2', default_util.FINANCIAL_REPORT_B[1] if len(default_util.FINANCIAL_REPORT_B) > 1 else "Report B Q2 Default"),
            form_data_dict.get('financial_report_b_q3', default_util.FINANCIAL_REPORT_B[2] if len(default_util.FINANCIAL_REPORT_B) > 2 else "Report B Q3 Default"), 
            form_data_dict.get('financial_report_b_q4', default_util.FINANCIAL_REPORT_B[3] if len(default_util.FINANCIAL_REPORT_B) > 3 else "Report B Q4 Default")]
        config['FINANCIAL_REPORT_A'] = [rep for rep in config['FINANCIAL_REPORT_A'] if rep]
        config['FINANCIAL_REPORT_B'] = [rep for rep in config['FINANCIAL_REPORT_B'] if rep]
        config['EVENT_1_DAY'] = int(form_data_dict.get('event_1_day', default_util.EVENT_1_DAY))
        config['EVENT_1_MESSAGE'] = form_data_dict.get('event_1_message', default_util.EVENT_1_MESSAGE)
        event_1_loan_rate_str = form_data_dict.get('event_1_loan_rate', ",".join(map(str,default_util.EVENT_1_LOAN_RATE)) if default_util.EVENT_1_LOAN_RATE else "0.024,0.027,0.030")
        config['EVENT_1_LOAN_RATE'] = [float(s.strip()) for s in event_1_loan_rate_str.split(',') if s.strip()] if event_1_loan_rate_str else list(default_util.EVENT_1_LOAN_RATE)
        config['EVENT_2_DAY'] = int(form_data_dict.get('event_2_day', default_util.EVENT_2_DAY))
        config['EVENT_2_MESSAGE'] = form_data_dict.get('event_2_message', default_util.EVENT_2_MESSAGE)
        event_2_loan_rate_str = form_data_dict.get('event_2_loan_rate', ",".join(map(str,default_util.EVENT_2_LOAN_RATE)) if default_util.EVENT_2_LOAN_RATE else "0.0255,0.0285,0.0315")
        config['EVENT_2_LOAN_RATE'] = [float(s.strip()) for s in event_2_loan_rate_str.split(',') if s.strip()] if event_2_loan_rate_str else list(default_util.EVENT_2_LOAN_RATE)
        # --- End Populate config ---

        class Args: pass
        args = Args()
        args.model = config['MODEL_NAME']

        with simulation_lock:
             results_container_arg["progress_message"] = "Simulation core logic starting..."

        # Pass both results_container (for polling data) and sse_q (for live events)
        simulation_main.simulation(args, config, results_container_arg, sse_q) # MODIFIED

        with simulation_lock:
            simulation_status = "completed"
            results_container_arg["progress_message"] = "Simulation completed successfully."
        print("Simulation task finished successfully.")

    except Exception as e:
        print(f"Error during simulation task: {e}")
        detailed_error = traceback.format_exc()
        print(detailed_error)
        with simulation_lock:
            simulation_status = "error"
            # Update both polling data and send SSE error
            simulation_data["error_message"] = f"{type(e).__name__}: {str(e)}\n{detailed_error}"
            simulation_data["progress_message"] = "Simulation failed."
        # Send error via SSE as well
        sse_q.put({"type": "status_update", "payload": {"status": "error", "error_message": f"{type(e).__name__}: {str(e)}", "progress_message":"Simulation failed."}})

    finally:
        final_status_payload = {}
        with simulation_lock:
            if simulation_status == "running":
                simulation_status = "error"
                if not simulation_data.get("error_message"):
                    simulation_data["error_message"] = "Simulation ended abruptly."
                simulation_data["progress_message"] = "Simulation failed (abrupt/unknown end)."

            final_status_payload = { # Prepare final status for SSE
                "status": simulation_status,
                "progress_message": simulation_data["progress_message"],
                "error_message": simulation_data["error_message"]
            }
        sse_q.put({"type": "status_update", "payload": final_status_payload})
        sse_q.put(None) # Signal end of stream
        print("Simulation task definitively concluded. SSE queue signaled for end.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run_simulation', methods=['POST'])
def run_simulation_route():
    global simulation_thread, simulation_status, simulation_data, sse_event_queue

    with simulation_lock:
        if simulation_status == "running":
            return "A simulation is already running. Please wait.", 429

    form_data_as_dict = request.form.to_dict()

    # Pass both simulation_data (for polling) and sse_event_queue (for SSE)
    simulation_thread = threading.Thread(target=run_simulation_task, args=(form_data_as_dict, simulation_data, sse_event_queue)) # MODIFIED
    simulation_thread.start()

    return redirect(url_for('status_page'))

@app.route('/status')
def status_page():
    return render_template('status.html')

# Polling endpoint for the main prediction table
@app.route('/get_simulation_update')
def get_simulation_update():
    with simulation_lock:
        response_data = {
            "status": simulation_status,
            "records": list(simulation_data["daily_agent_records"]), # Contains AgentRecordDaily dicts
            "error": simulation_data["error_message"],
            "progress": simulation_data["progress_message"]
        }
    return jsonify(response_data)

# SSE endpoint for the live event feed
@app.route('/stream-results')
def stream_results():
    def event_generator():
        # Send an initial message to confirm connection
        yield f"event: connection_ack\ndata: Connected to real-time event stream.\n\n"

        # Send current status immediately
        with simulation_lock:
            initial_status_payload = {
                "status": simulation_status,
                "progress_message": simulation_data["progress_message"],
                "error_message": simulation_data["error_message"]
            }
        yield f"event: status_update\ndata: {json.dumps(initial_status_payload)}\n\n"

        # If simulation already finished when client connects, maybe send end signal?
        # Or let it naturally end when queue polling finds non-running status.
        # For now, just start listening to queue.

        last_keep_alive = time.time()
        while True:
            try:
                message = sse_event_queue.get(timeout=0.5)
                if message is None: # End of stream signal
                    print("SSE stream: Received None, signaling end from task.")
                    yield f"event: stream_end\ndata: Simulation task signaled end.\n\n"
                    break

                event_type = message.get("type", "message")
                payload_json = json.dumps(message.get("payload", {}))
                yield f"event: {event_type}\ndata: {payload_json}\n\n"
                last_keep_alive = time.time()

            except queue.Empty:
                with simulation_lock: current_sim_status = simulation_status
                if current_sim_status != "running":
                    print(f"SSE stream: Simulation status is {current_sim_status}, ending stream.")
                    yield f"event: stream_end\ndata: Simulation no longer running. Status: {current_sim_status}.\n\n"
                    break
                if time.time() - last_keep_alive > 15:
                    yield ": keep-alive\n\n"
                    last_keep_alive = time.time()
                continue
            except Exception as e:
                print(f"Error in SSE event_generator: {e}")
                error_payload = {"message": f"Stream error: {str(e)}"}
                yield f"event: stream_error\ndata: {json.dumps(error_payload)}\n\n"
                break
        print("SSE event_generator loop ended.")

    return Response(event_generator(), mimetype='text/event-stream')


if __name__ == '__main__':
    app.run(debug=True, port=5001, threaded=True) # Use threaded for dev server with SSE