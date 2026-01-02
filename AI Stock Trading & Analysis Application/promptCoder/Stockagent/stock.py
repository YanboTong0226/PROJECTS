# import util # No longer directly used for FINANCIAL_REPORTS

class Stock:
    def __init__(self, name, initial_price, initial_stock, is_new=False, config=None): # Added config
        self.name = name
        self.price = initial_price
        self.ideal_price = 0 # What is this used for?
        self.initial_stock = initial_stock # Is this used?
        self.history = {}   # {date: session_deal}
        self.session_deal = [] # [{"price", "amount"}]
        self.config = config # Store config

    def gen_financial_report(self, index):
        # Access financial reports from the stored config
        if self.config:
            reports = []
            if self.name == "A":
                reports = self.config.get('FINANCIAL_REPORT_A', [])
            elif self.name == "B":
                reports = self.config.get('FINANCIAL_REPORT_B', [])
            
            if 0 <= index < len(reports):
                return reports[index]
            else:
                # Fallback or error if index is out of bounds or reports not found
                return f"Financial report for Stock {self.name} quarter index {index} not available."
        return f"Configuration not available for Stock {self.name} financial reports."


    def add_session_deal(self, price_and_amount):
        self.session_deal.append(price_and_amount)

    def update_price(self, date):
        if len(self.session_deal) == 0:
            # Optional: implement price decay or stability if no trades
            return
        self.price = self.session_deal[-1]["price"]
        # Storing a copy of session_deal for history
        self.history[date] = list(self.session_deal) # Store a copy
        self.session_deal.clear()

    def get_price(self):
        return self.price

