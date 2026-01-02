# main.py
import argparse
import random # Ensure this is imported
from agent import Agent
from secretary import Secretary
from stock import Stock
from log.custom_logger import log
from record import create_stock_record, create_trade_record, AgentRecordDaily, create_agentses_record
import queue # For type hinting and usage
import json
import traceback

# --- Function Definition ---
def get_agent(all_agents, order):
    """Finds an agent object in a list by its order ID."""
    for agent_obj in all_agents:
        if agent_obj.order == order:
            return agent_obj
    return None # Return None if agent not found
# --- End Function Definition ---

# Modified handle_action to accept sse_q
def handle_action(action, stock_deals, all_agents, stock, session, config, sse_q: queue.Queue = None):
    try:
        agent_order = action["agent"]
        agent_obj = get_agent(all_agents, agent_order)

        def send_sse_event(event_type, payload): # Helper
            if sse_q:
                try: sse_q.put({"type": event_type, "payload": payload})
                except Exception as e: log.logger.error(f"Error putting message in SSE queue: {e}")

        if action["action_type"] == "buy":
            for sell_action in stock_deals["sell"][:]:
                if action["price"] == sell_action["price"]:
                    close_amount = min(action["amount"], sell_action["amount"])
                    buyer_agent_id = action["agent"]; seller_agent_id = sell_action["agent"]
                    if agent_obj: agent_obj.buy_stock(stock.name, action["price"], close_amount)
                    if seller_agent_id != -1:
                        agent_selling_obj = get_agent(all_agents, seller_agent_id)
                        if agent_selling_obj: agent_selling_obj.sell_stock(stock.name, action["price"], close_amount)
                    stock.add_session_deal({"price": action["price"], "amount": close_amount})
                    create_trade_record(action["date"], session, stock.name, buyer_agent_id, seller_agent_id, close_amount, action["price"])
                    log_msg = f"ACTION - BUY:{buyer_agent_id}, SELL:{seller_agent_id}, STOCK:{stock.name}, PRICE:{action['price']}, AMOUNT:{close_amount}"
                    log.logger.info(log_msg)
                    # --- Send trade execution event ---
                    send_sse_event("trade_executed", {"date": action["date"], "session": session, "stock": stock.name,"buyer": buyer_agent_id, "seller": seller_agent_id, "amount": close_amount, "price": action['price'],"description": log_msg})
                    # --- End Send ---
                    if action["amount"] > close_amount:
                        stock_deals["sell"].remove(sell_action); action["amount"] -= close_amount
                    else:
                        sell_action["amount"] -= close_amount
                        if sell_action["amount"] <= 0: stock_deals["sell"].remove(sell_action)
                        return
            if action["amount"] > 0: stock_deals["buy"].append(action)
        else: # sell
            if not agent_obj: log.logger.warning(f"Attempted sell by non-existent agent {agent_order}"); return
            for buy_action in stock_deals["buy"][:]:
                if action["price"] == buy_action["price"]:
                    close_amount = min(action["amount"], buy_action["amount"])
                    buyer_agent_id = buy_action["agent"]; seller_agent_id = action["agent"]
                    agent_obj.sell_stock(stock.name, action["price"], close_amount)
                    agent_buying_match_obj = get_agent(all_agents, buyer_agent_id)
                    if agent_buying_match_obj: agent_buying_match_obj.buy_stock(stock.name, action["price"], close_amount)
                    stock.add_session_deal({"price": action["price"], "amount": close_amount})
                    create_trade_record(action["date"], session, stock.name, buyer_agent_id, seller_agent_id, close_amount, action["price"])
                    log_msg = f"ACTION - BUY:{buyer_agent_id}, SELL:{seller_agent_id}, STOCK:{stock.name}, PRICE:{action['price']}, AMOUNT:{close_amount}"
                    log.logger.info(log_msg)
                     # --- Send trade execution event ---
                    send_sse_event("trade_executed", {"date": action["date"], "session": session, "stock": stock.name,"buyer": buyer_agent_id, "seller": seller_agent_id, "amount": close_amount, "price": action['price'], "description": log_msg})
                     # --- End Send ---
                    if action["amount"] > close_amount:
                        stock_deals["buy"].remove(buy_action); action["amount"] -= close_amount
                    else:
                        buy_action["amount"] -= close_amount
                        if buy_action["amount"] <= 0: stock_deals["buy"].remove(buy_action)
                        return
            if action["amount"] > 0: stock_deals["sell"].append(action)
    except Exception as e:
        log.logger.error(f"handle_action error: {e}, action: {action}")
        log.logger.error(traceback.format_exc())
        return


def simulation(args, config, results_accumulator, sse_q: queue.Queue = None):
    log.logger.info(f"Simulation starting with config keys: {list(config.keys())}")
    secretary = Secretary(model=config['MODEL_NAME'], api_key=config['GEMINI_API_KEY'])
    stock_a = Stock("A", config['STOCK_A_INITIAL_PRICE'], 0, is_new=False, config=config)
    stock_b = Stock("B", config['STOCK_B_INITIAL_PRICE'], 0, is_new=False, config=config)
    all_agents = []
    log.logger.debug("Agents initial...")
    for i in range(0, config['AGENTS_NUM']):
        agent_obj = Agent(i, stock_a.get_price(), stock_b.get_price(), secretary, model=config['MODEL_NAME'], config=config)
        all_agents.append(agent_obj)
    last_day_forum_message = []
    stock_a_deals = {"sell": [], "buy": []}; stock_b_deals = {"sell": [], "buy": []}
    current_loan_rates = list(config['LOAN_RATE'])
    def send_sse(event_type, payload): # Helper
        if sse_q:
            try: sse_q.put({"type": event_type, "payload": payload})
            except Exception as e: log.logger.error(f"Error putting message in SSE queue: {e}")
    log.logger.debug("--------Simulation Start!--------")

    for date in range(1, config['TOTAL_DATE'] + 1):
        log.logger.debug(f"--------DAY {date}---------")
        send_sse("day_start", {"date": date})
        progress_message = f"Processing Day {date}/{config['TOTAL_DATE']}"
        if isinstance(results_accumulator, dict): results_accumulator["progress_message"] = progress_message
        send_sse("progress_update", {"status": "running", "progress_message": progress_message})

        stock_a_deals["sell"].clear(); stock_a_deals["buy"].clear()
        stock_b_deals["buy"].clear(); stock_b_deals["sell"].clear()
        for agent_obj in all_agents[:]:
            if agent_obj.quit: continue
            agent_obj.chat_history.clear(); agent_obj.loan_repayment(date)
        if date in config['REPAYMENT_DAYS']:
            for agent_obj in all_agents:
                if agent_obj.quit: continue; agent_obj.interest_payment()
        for i in range(len(all_agents) - 1, -1, -1):
            agent_obj = all_agents[i]
            if agent_obj.quit: continue
            if agent_obj.is_bankrupt or agent_obj.cash < 0:
                quit_sig = agent_obj.bankrupt_process(stock_a.get_price(), stock_b.get_price())
                if quit_sig:
                    log.logger.info(f"Agent {agent_obj.order} quit due to bankruptcy on day {date}.")
                    send_sse("agent_status", {"agent": agent_obj.order, "status": "bankrupt", "date": date})
                    all_agents.pop(i)

        active_agents_for_events = [ag for ag in all_agents if not ag.quit]
        if date == config['EVENT_1_DAY']:
            current_loan_rates = list(config['EVENT_1_LOAN_RATE'])
            for agent_obj in active_agents_for_events: agent_obj.update_loan_rates(current_loan_rates)
            event_msg = config['EVENT_1_MESSAGE']; last_day_forum_message.append({"name": -1, "message": event_msg})
            log.logger.info(f"EVENT 1 TRIGGERED."); send_sse("market_event", {"date": date, "message": f"EVENT 1: {event_msg}"})
        if date == config['EVENT_2_DAY']:
             current_loan_rates = list(config['EVENT_2_LOAN_RATE'])
             for agent_obj in active_agents_for_events: agent_obj.update_loan_rates(current_loan_rates)
             event_msg = config['EVENT_2_MESSAGE']; last_day_forum_message.append({"name": -1, "message": event_msg})
             log.logger.info(f"EVENT 2 TRIGGERED."); send_sse("market_event", {"date": date, "message": f"EVENT 2: {event_msg}"})

        temp_daily_agent_records_objects = []
        active_agents_for_loan = [ag for ag in all_agents if not ag.quit]
        for agent_obj in active_agents_for_loan:
            loan_decision = agent_obj.plan_loan(date, stock_a.get_price(), stock_b.get_price(), last_day_forum_message)
            send_sse("loan_decision", {"date": date, "agent": agent_obj.order, "decision": loan_decision})
            record_obj = AgentRecordDaily(agent_obj.order, date, loan_decision)
            temp_daily_agent_records_objects.append(record_obj)

        for session in range(1, config['TOTAL_SESSION'] + 1):
            log.logger.debug(f"SESSION {session}")
            send_sse("session_start", {"date": date, "session": session})
            active_agents_for_session = [ag for ag in all_agents if not ag.quit]
            if not active_agents_for_session: break
            sequence = list(range(len(active_agents_for_session))); random.shuffle(sequence)
            for i_seq in sequence:
                agent_obj = active_agents_for_session[i_seq]
                action = agent_obj.plan_stock(date, session, stock_a, stock_b, stock_a_deals, stock_b_deals)
                if action.get("action_type") != "no":
                    log.logger.info(f"INFO: Agent {agent_obj.order} decide to action: {action}")
                    send_sse("session_action_decision", {"date": date, "session": session, "agent": agent_obj.order, "action_details": action})
                proper, cash, val_a, val_b = agent_obj.get_proper_cash_value(stock_a.get_price(), stock_b.get_price())
                create_agentses_record(agent_obj.order, date, session, proper, cash, val_a, val_b, action)
                action["agent"] = agent_obj.order; action["date"] = date
                if not action["action_type"] == "no":
                    if action["stock"] == 'A': handle_action(action, stock_a_deals, all_agents, stock_a, session, config, sse_q)
                    else: handle_action(action, stock_b_deals, all_agents, stock_b, session, config, sse_q)

            stock_a.update_price(date); stock_b.update_price(date)
            create_stock_record(date, session, stock_a.get_price(), stock_b.get_price())
            send_sse("stock_price_update", {"date": date, "session": session, "stock_a": stock_a.get_price(), "stock_b": stock_b.get_price()})

        active_agents_for_estimate = [ag for ag in all_agents if not ag.quit]
        for record_obj_for_day in temp_daily_agent_records_objects:
            agent_obj = get_agent(active_agents_for_estimate, record_obj_for_day.agent)
            if agent_obj:
                estimation = agent_obj.next_day_estimate()
                log.logger.info(f"Agent {agent_obj.order} tomorrow estimation: {estimation}")
                record_obj_for_day.add_estimate(estimation)

                simplified_prediction_payload = {
                    "date": date,
                    "agent": agent_obj.order,
                    "prediction": estimation
                }
                log.logger.debug(f"Sending SSE 'daily_prediction' for Agent {agent_obj.order}")
                send_sse("daily_prediction", simplified_prediction_payload)

                record_obj_for_day.write_to_excel()

                if isinstance(results_accumulator, dict) and "daily_agent_records" in results_accumulator:
                    results_accumulator["daily_agent_records"].append(record_obj_for_day.to_dict())

        last_day_forum_message.clear()
        log.logger.debug(f"DAY {date} ends, collecting forum messages...")
        active_agents_for_forum = [ag for ag in all_agents if not ag.quit]
        for agent_obj in active_agents_for_forum:
            message = agent_obj.post_message()
            log.logger.info(f"Agent {agent_obj.order} says: {message}")
            forum_payload = {"date": date, "agent": agent_obj.order, "message": message}
            last_day_forum_message.append(forum_payload)
            send_sse("forum_post", forum_payload)

    log.logger.debug("--------Simulation finished!--------")
    log.logger.debug(f"Final number of active agents: {len([ag for ag in all_agents if not ag.quit])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="gemini-2.5-flash-lite", help="model name")
    cli_args = parser.parse_args()
    
    import util as default_util_for_cli

    default_config = {
        'GEMINI_API_KEY': default_util_for_cli.GEMINI_API_KEY,
        'MODEL_NAME': cli_args.model,
        'AGENTS_NUM': default_util_for_cli.AGENTS_NUM,
        'TOTAL_DATE': default_util_for_cli.TOTAL_DATE,
        'TOTAL_SESSION': default_util_for_cli.TOTAL_SESSION,
        'STOCK_A_INITIAL_PRICE': default_util_for_cli.STOCK_A_INITIAL_PRICE,
        'STOCK_B_INITIAL_PRICE': default_util_for_cli.STOCK_B_INITIAL_PRICE,
        'MAX_INITIAL_PROPERTY': default_util_for_cli.MAX_INITIAL_PROPERTY,
        'MIN_INITIAL_PROPERTY': default_util_for_cli.MIN_INITIAL_PROPERTY,
        'LOAN_TYPE': list(default_util_for_cli.LOAN_TYPE),
        'LOAN_TYPE_DATE': list(default_util_for_cli.LOAN_TYPE_DATE),
        'LOAN_RATE': list(default_util_for_cli.LOAN_RATE),
        'REPAYMENT_DAYS': list(default_util_for_cli.REPAYMENT_DAYS),
        'SEASONAL_DAYS': default_util_for_cli.SEASONAL_DAYS,
        'SEASON_REPORT_DAYS': list(default_util_for_cli.SEASON_REPORT_DAYS),
        'FINANCIAL_REPORT_A': list(default_util_for_cli.FINANCIAL_REPORT_A),
        'FINANCIAL_REPORT_B': list(default_util_for_cli.FINANCIAL_REPORT_B),
        'EVENT_1_DAY': default_util_for_cli.EVENT_1_DAY,
        'EVENT_1_MESSAGE': default_util_for_cli.EVENT_1_MESSAGE,
        'EVENT_1_LOAN_RATE': list(default_util_for_cli.EVENT_1_LOAN_RATE),
        'EVENT_2_DAY': default_util_for_cli.EVENT_2_DAY,
        'EVENT_2_MESSAGE': default_util_for_cli.EVENT_2_MESSAGE,
        'EVENT_2_LOAN_RATE': list(default_util_for_cli.EVENT_2_LOAN_RATE),
    }
    dummy_results_accumulator = {"daily_agent_records": [], "error_message": "", "progress_message": ""}
    simulation(cli_args, default_config, dummy_results_accumulator, None)
    dummy_results_accumulator = {"daily_agent_records": [], "error_message": "", "progress_message": ""}; simulation(cli_args, default_config, dummy_results_accumulator, None)