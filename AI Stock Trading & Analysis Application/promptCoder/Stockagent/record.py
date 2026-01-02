import pandas as pd
import os

# Trade Record
class TradeRecord:
    def __init__(self, date, session, stock_type, buyer, seller, quantity, price):
        self.date = date
        self.session = session
        self.stock_type = stock_type
        self.buyer = buyer
        self.seller = seller
        self.quantity = quantity
        self.price = price

    def write_to_excel(self, file_name="res/trades.xlsx"):
        columns = ["Trading Day", "Trading Session", "Stock Symbol", "Buyer ID", "Seller ID", "Quantity", "Trade Price"]
        if os.path.isfile(file_name):
            try:
                existing_df = pd.read_excel(file_name)
                if not all(col in existing_df.columns for col in columns) or len(existing_df.columns) != len(columns):
                    print(f"Columns mismatch in {file_name}, data structure might have changed. Overwriting with new structure.")
                    existing_df = pd.DataFrame(columns=columns) # Reinitialize to ensure correct structure
            except Exception as e:
                print(f"Error reading existing Excel {file_name}: {e}. Creating new DataFrame.")
                existing_df = pd.DataFrame(columns=columns)
        else:
            existing_df = pd.DataFrame(columns=columns)

        new_records_data = [[self.date, self.session, self.stock_type, self.buyer, self.seller, self.quantity, self.price]]
        
        # Ensure new_df has the correct columns from the start
        new_df = pd.DataFrame(new_records_data, columns=columns)

        if existing_df.empty:
            all_records_df = new_df
        else:
            all_records_df = pd.concat([existing_df, new_df], ignore_index=True)
        
        try:
            all_records_df.to_excel(file_name, index=False)
        except Exception as e:
            print(f"Error writing to Excel {file_name}: {e}")


def create_trade_record(date, stage, stock, buy_trader, sell_trader, amount, price):
    record = TradeRecord(date, stage, stock, buy_trader, sell_trader, amount, price)
    record.write_to_excel()
    record = None # Optional: hints for garbage collection


class StockRecord:
    def __init__(self, date, session, stock_a_price, stock_b_price):
        self.date = date
        self.session = session
        self.stock_a_price = stock_a_price
        self.stock_b_price = stock_b_price

    def write_to_excel(self, file_name="res/stocks.xlsx"):
        columns = ["Trading Day", "Trading Session", "Stock A Price (End of Session)", "Stock B Price (End of Session)"]
        if os.path.isfile(file_name):
            try:
                existing_df = pd.read_excel(file_name)
                if not all(col in existing_df.columns for col in columns) or len(existing_df.columns) != len(columns):
                    print(f"Columns mismatch in {file_name}, data structure might have changed. Overwriting with new structure.")
                    existing_df = pd.DataFrame(columns=columns)
            except Exception as e:
                print(f"Error reading existing Excel {file_name}: {e}. Creating new DataFrame.")
                existing_df = pd.DataFrame(columns=columns)
        else:
            existing_df = pd.DataFrame(columns=columns)

        new_records_data = [[self.date, self.session, self.stock_a_price, self.stock_b_price]]
        new_df = pd.DataFrame(new_records_data, columns=columns)

        if existing_df.empty:
            all_records_df = new_df
        else:
            all_records_df = pd.concat([existing_df, new_df], ignore_index=True)
            
        try:
            all_records_df.to_excel(file_name, index=False)
        except Exception as e:
            print(f"Error writing to Excel {file_name}: {e}")

def create_stock_record(date, session, stock_a_price, stock_b_price):
    record = StockRecord(date, session, stock_a_price, stock_b_price)
    record.write_to_excel()
    record = None # Optional


class AgentRecordDaily:
    def __init__(self, agent_id, date, loan_json): # agent_id is the agent's order/ID
        self.agent = agent_id # Store agent ID
        self.date = date
        self.if_loan = loan_json.get("loan", "no") # Use .get for safety
        self.loan_type = None # Initialize to None
        self.loan_amount = 0
        if self.if_loan == "yes":
            self.loan_type = loan_json.get("loan_type") 
            self.loan_amount = loan_json.get("amount", 0)
        self.will_loan = "no"
        self.will_buy_a = "no"
        self.will_sell_a = "no"
        self.will_buy_b = "no"
        self.will_sell_b = "no"

    def add_estimate(self, js):
        self.will_loan = js.get("loan", "no")
        self.will_buy_a = js.get("buy_A", "no")
        self.will_sell_a = js.get("sell_A", "no")
        self.will_buy_b = js.get("buy_B", "no")
        self.will_sell_b = js.get("sell_B", "no")

    def to_dict(self):
        return {
            "agent": self.agent,
            "date": self.date,
            "if_loan": self.if_loan,
            "loan_type": self.loan_type,
            "loan_amount": self.loan_amount,
            "will_loan": self.will_loan,
            "will_buy_a": self.will_buy_a,
            "will_sell_a": self.will_sell_a,
            "will_buy_b": self.will_buy_b,
            "will_sell_b": self.will_sell_b
        }

    def write_to_excel(self, file_name="res/agent_day_record.xlsx"):
        columns = ["Agent ID", "Trading Day", "Loan Taken?", "Loan Type", "Loan Amount",
                   "Next Day Est: Loan", "Next Day Est: Buy A", "Next Day Est: Sell A", "Next Day Est: Buy B", "Next Day Est: Sell B"]
        if os.path.isfile(file_name):
            try:
                existing_df = pd.read_excel(file_name)
                if not all(col in existing_df.columns for col in columns) or len(existing_df.columns) != len(columns):
                    print(f"Columns mismatch in {file_name}, data structure might have changed. Overwriting with new structure.")
                    existing_df = pd.DataFrame(columns=columns)
            except Exception as e:
                print(f"Error reading existing Excel {file_name}: {e}. Creating new DataFrame.")
                existing_df = pd.DataFrame(columns=columns)
        else:
            existing_df = pd.DataFrame(columns=columns)

        new_records_data = [self.agent, self.date, self.if_loan, self.loan_type, self.loan_amount,
                            self.will_loan, self.will_buy_a, self.will_sell_a, self.will_buy_b, self.will_sell_b]
        
        new_df = pd.DataFrame([new_records_data], columns=columns)
        
        if existing_df.empty:
            all_records_df = new_df
        else:
            # Ensure data types are compatible if possible, though concat usually handles it.
            # For simplicity, direct concat is used. For robust production, you might want dtype checks/coercion.
            all_records_df = pd.concat([existing_df, new_df], ignore_index=True)
            
        try:
            all_records_df.to_excel(file_name, index=False)
        except Exception as e:
            print(f"Error writing to Excel {file_name}: {e}")


class AgentRecordSession:
    def __init__(self, agent, date, session, proper, cash, stock_a_value, stock_b_value, action_json):
        self.agent = agent
        self.date = date
        self.session = session
        self.proper = proper
        self.cash = cash
        self.stock_a_value = stock_a_value
        self.stock_b_value = stock_b_value
        self.action_stock = "-" # Default if no action or stock specified
        self.amount = 0
        self.price = 0
        self.action_type = action_json.get("action_type", "no") # Use .get for safety
        if not self.action_type == "no":
            self.action_stock = action_json.get("stock", "-")
            self.amount = action_json.get("amount", 0)
            self.price = action_json.get("price", 0)

    def write_to_excel(self, file_name="res/agent_session_record.xlsx"):
        columns = ["Agent ID", "Trading Day", "Trading Session", "Total Assets (Before Trade)",
                   "Cash (Before Trade)", "Stock A Value (Before Trade)", "Stock B Value (Before Trade)",
                   "Order Type", "Order Stock Symbol", "Order Quantity", "Order Price"]
        if os.path.isfile(file_name):
            try:
                existing_df = pd.read_excel(file_name)
                if not all(col in existing_df.columns for col in columns) or len(existing_df.columns) != len(columns):
                    print(f"Columns mismatch in {file_name}, data structure might have changed. Overwriting with new structure.")
                    existing_df = pd.DataFrame(columns=columns)
            except Exception as e:
                print(f"Error reading existing Excel {file_name}: {e}. Creating new DataFrame.")
                existing_df = pd.DataFrame(columns=columns)
        else:
            existing_df = pd.DataFrame(columns=columns)

        new_records_data = [self.agent, self.date, self.session, self.proper, self.cash,
                            self.stock_a_value, self.stock_b_value, self.action_type, self.action_stock,
                            self.amount, self.price]
        
        new_df = pd.DataFrame([new_records_data], columns=columns)

        if existing_df.empty:
            all_records_df = new_df
        else:
            all_records_df = pd.concat([existing_df, new_df], ignore_index=True)
            
        try:
            all_records_df.to_excel(file_name, index=False)
        except Exception as e:
            print(f"Error writing to Excel {file_name}: {e}")


def create_agentses_record(agent, date, session, proper, cash, stock_a_value, stock_b_value, action_json):
    record = AgentRecordSession(agent, date, session, proper, cash, stock_a_value, stock_b_value, action_json)
    record.write_to_excel()
    record = None # Optional
