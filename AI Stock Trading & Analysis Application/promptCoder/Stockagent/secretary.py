import json
import os
from log.custom_logger import log

class Secretary:
    def __init__(self, model: str, api_key: str):
        self.model = model
        # The api_key is passed but not directly used by the Secretary,
        # as all API calls are handled by the Agent.
        log.logger.info(f"Secretary initialized for model: {self.model}")

    def _extract_json_from_response(self, resp: str) -> (str, str):
        """
        A robust function to extract a JSON string from an LLM's response.
        Handles both markdown code fences and raw JSON objects.
        Returns (json_string, error_message).
        """
        # --- START OF NEW, ROBUST LOGIC ---
        try:
            # Case 1: The response contains a markdown JSON block
            if "```json" in resp:
                start_marker = "```json"
                end_marker = "```"
                start_idx = resp.find(start_marker)
                
                if start_idx != -1:
                    start_idx += len(start_marker)
                    end_idx = resp.find(end_marker, start_idx)
                    
                    if end_idx != -1:
                        json_str = resp[start_idx:end_idx].strip()
                        return json_str, "" # Success
                
            # Case 2: No markdown, find the first '{' and last '}'
            start_idx = resp.find('{')
            end_idx = resp.rfind('}')

            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                json_str = resp[start_idx:end_idx + 1].strip()
                return json_str, "" # Success

            # If neither method works, return an error
            return None, "Could not find a valid JSON object or markdown block in the response."

        except Exception as e:
            return None, f"An unexpected error occurred during JSON extraction: {e}"
        # --- END OF NEW, ROBUST LOGIC ---

    def check_loan(self, resp, max_loan, num_loan_types) -> (bool, str, dict):
        if not resp or not isinstance(resp, str):
            return False, "Invalid or empty response from API.", {}

        action_json_str, error_msg = self._extract_json_from_response(resp)
        if error_msg:
            log.logger.error(f"JSON Extraction Failed: {error_msg}. Original: '{resp}'")
            return False, error_msg, {}

        try:
            parsed_json = json.loads(action_json_str)
        except json.JSONDecodeError as e:
            fail_response = f"Illegal json format: {e}. Ensure valid JSON."
            log.logger.error(f"{fail_response} String: '{action_json_str}'. Original: '{resp}'")
            return False, fail_response, {}

        try:
            if "loan" not in parsed_json:
                return False, "Key 'loan' not in response.", {}
            loan_decision = str(parsed_json["loan"]).lower()
            if loan_decision not in ["yes", "no"]:
                return False, "Value of key 'loan' should be 'yes' or 'no'.", {}
            parsed_json["loan"] = loan_decision

            if loan_decision == "no":
                if "loan_type" in parsed_json or "amount" in parsed_json:
                    return False, "Don't include loan_type or amount if 'loan' is no.", {}
                return True, "", parsed_json

            if loan_decision == "yes":
                if "loan_type" not in parsed_json or "amount" not in parsed_json:
                    return False, "Should include loan_type and amount if 'loan' is yes.", {}
                
                loan_type_val = parsed_json["loan_type"]
                if not isinstance(loan_type_val, int) or not (0 <= loan_type_val < num_loan_types):
                    fail_msg = f"Value of key 'loan_type' should be an integer from 0 to {num_loan_types-1}."
                    return False, fail_msg, {}
                
                amount_val = parsed_json["amount"]
                if not (isinstance(amount_val, (int, float)) and 0 < amount_val <= max_loan):
                    fail_msg = f"Value of 'amount' should be a positive number <= max_loan ({max_loan})."
                    return False, fail_msg, {}
                parsed_json["amount"] = float(amount_val)
                return True, "", parsed_json
            
            log.logger.error(f"UNSOLVED LOAN JSON (logic error):{parsed_json}")
            return False, "Internal logic error in loan checking.", {}
        except Exception as e:
            log.logger.error(f"Unexpected error during loan content validation: {e}. JSON: {parsed_json}")
            return False, f"Unexpected validation error: {e}", {}

    def check_action(self, resp, cash, stock_a_amount, 
                     stock_b_amount, stock_a_price, stock_b_price) -> (bool, str, dict):
        if not resp or not isinstance(resp, str):
            return False, "Invalid or empty response from API.", {}

        action_json_str, error_msg = self._extract_json_from_response(resp)
        if error_msg:
            log.logger.error(f"JSON Extraction Failed: {error_msg}. Original: '{resp}'")
            return False, error_msg, {}

        try:
            parsed_json = json.loads(action_json_str)
        except json.JSONDecodeError as e:
            return False, f"Illegal json format: {e}. Extracted string was: '{action_json_str}'", {}

        try:
            if "action_type" not in parsed_json: return False, "Key 'action_type' not in response.", {}
            action_type = str(parsed_json["action_type"]).lower()
            if action_type not in ["buy", "sell", "no"]:
                return False, "Value of 'action_type' must be 'buy', 'sell', or 'no'.", {}
            parsed_json["action_type"] = action_type

            if action_type == "no":
                if any(k in parsed_json for k in ["stock", "amount", "price"]):
                    return False, "Don't include stock, amount, or price if 'action_type' is no.", {}
                return True, "", parsed_json
            else:
                required = ["stock", "amount", "price"]
                if not all(k in parsed_json for k in required):
                    return False, f"Must include {', '.join(required)} for 'buy'/'sell'.", {}

                stock_id = str(parsed_json["stock"])
                if stock_id not in ['A', 'B']: return False, "Value of 'stock' must be 'A' or 'B'.", {}
                
                amount = parsed_json["amount"]
                if not (isinstance(amount, int) and amount > 0):
                    return False, "Value of 'amount' must be a positive integer.", {}

                price_llm = parsed_json["price"]
                if not (isinstance(price_llm, (int, float)) and price_llm > 0):
                    return False, "Value of 'price' must be a positive number.", {}

                transaction_value = amount * price_llm
                if action_type == "buy" and transaction_value > cash:
                    return False, f"Proposed buy ({transaction_value:.2f}) exceeds cash ({cash:.2f}).", {}
                
                if action_type == "sell":
                    holding = stock_a_amount if stock_id == 'A' else stock_b_amount
                    if amount > holding:
                        return False, f"Proposed sell ({amount}) exceeds holdings ({holding} of {stock_id}).", {}
                return True, "", parsed_json

            log.logger.error(f"UNSOLVED ACTION JSON (logic error):{parsed_json}")
            return False, "Internal logic error in action checking.", {}
        except Exception as e:
            log.logger.error(f"Unexpected error during action content validation: {e}. JSON: {parsed_json}")
            return False, f"Unexpected validation error: {e}", {}


    def check_estimate(self, resp) -> (bool, str, dict):
        if not resp or not isinstance(resp, str):
            return False, "Invalid or empty response from API.", {}

        action_json_str, error_msg = self._extract_json_from_response(resp)
        if error_msg:
            log.logger.error(f"JSON Extraction Failed: {error_msg}. Original: '{resp}'")
            return False, error_msg, {}

        try:
            parsed_json = json.loads(action_json_str)
        except json.JSONDecodeError as e:
            return False, f"Illegal json format: {e}. Extracted string was: '{action_json_str}'", {}

        try:
            expected_keys = ["buy_A", "buy_B", "sell_A", "sell_B", "loan"]
            if not all(k in parsed_json for k in expected_keys):
                return False, f"Expected keys missing. Need: {', '.join(expected_keys)}.", {}

            for key, value in parsed_json.items():
                if key not in expected_keys:
                    return False, f"Unexpected key '{key}'.", {}
                value_str = str(value).lower()
                if value_str not in ['yes', 'no']:
                    return False, f"Value for '{key}' must be 'yes' or 'no'.", {}
                parsed_json[key] = value_str
            return True, "", parsed_json
        except Exception as e:
            log.logger.error(f"Unexpected error during estimate content validation: {e}. JSON: {parsed_json}")
            return False, f"Unexpected validation error: {e}", {}