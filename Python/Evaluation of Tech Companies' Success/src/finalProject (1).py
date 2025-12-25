#!/usr/bin/env python
# coding: utf-8

# # This is the process of doing MI 562's Final Project. It aims to determine if the S&P 500 Tech companies are "successful" and the relationships between the finanial data. I referenced these methods from Google Gemini and edited by myself. To finish building the models, I used the frameworks, including the pandas, numpy, matplotlib, and scikit-learn, and generates the linear, polynomial curve, bubble chart, and bar charts.
# 

# In[32]:


import pandas as pd
import matplotlib.pyplot as plt
import numpy as np


# In[4]:


# Load the CSV file of Technology Sector List in the finalProjectData folder
df = pd.read_csv("finalProjectData/Technology Sector List.csv")
df.head()


# In[90]:


# Begin the data cleaning process
# 1. Remove Missing Values
df_clean = df.dropna(subset = ['Market Cap (Billions)', 'Price', 'PE Ratio'])
df_clean


# In[87]:


# 2. Filter out the stocks that have prices are under $5, only keep the established tech companies for analysis
df_clean = df_clean[df_clean['Price'] >= 5]
df_clean


# In[11]:


# 3. Identify the success outliers (High PE Ratio), which is Shoplify
print(f"Data Cleansing Complete. Remaining companies: {len(df_clean)}")


# In[23]:


# First Model: Higher Market Cap leads to higher price?
from sklearn.linear_model import LinearRegression
x = df_clean[['Market Cap (Billions)']]
y = df_clean['Price']

model_1 = LinearRegression()
model_1.fit(x,y)

r_squared = model_1.score(x, y)
intercept = model_1.intercept_
coefficient = model_1.coef_[0]

print(f"R-squared: {r_squared:.4f}")
print(f"Regression Equation: Price = {intercept:.2f} + {coefficient:.2f} * MarketCap")


# In[103]:


# Visualize the Regression Model
plt.figure(figsize=(12, 6))
plt.scatter(x, y, color='skyblue', alpha=0.7, label='Tech Companies')
# Generate the regression line
x_range = pd.DataFrame(np.linspace(x.min(), x.max(), 100), columns=['Market Cap (Billions)'])
y_pred = model_1.predict(x_range)
plt.plot(x_range, y_pred, color='red', linewidth=2, label=f'Linear Fit (R^2={r_squared:.4f})')

# Annotate outliers: label companies with high prices or high market caps
for i in range(len(df_clean)):
    symbol = df_clean.iloc[i]['Symbol']
    marketCap = df_clean.iloc[i]['Market Cap (Billions)']
    price = df_clean.iloc[i]['Price']

    if marketCap > 1000 or price > 500:
        plt.annotate(symbol, (marketCap, price), xytext = (5,5), textcoords = 'offset points', fontsize = 9)

plt.title('Market Cap vs. Stock Price')
plt.xlabel('Market Cap (Billions)')
plt.ylabel('Stock Price ($)')
plt.legend()
plt.grid(True)
plt.show()


# In[51]:


# Create the bar chart using Market Cap and Price
# Sort to get the Top 20 (Industry Leaders)
top_20 = df_clean.nlargest(20, 'Market Cap (Billions)')

# 3. Create the Bar Chart
plt.figure(figsize=(12, 8))
# 'Symbol' on X-axis, 'Market Cap' on Y-axis
plt.bar(top_20['Symbol'], top_20['Market Cap (Billions)'], color='gray', edgecolor='black')

# 4. Add labels and show the plot
plt.title('Top 20 Tech Companies by Market Cap')
plt.xlabel('Stock Symbol')
plt.ylabel('Market Cap ($ Billions)')
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.show()


# In[93]:


# Second Model: Sentiment vs Valuation (PE Ratio vs Price)
from sklearn.metrics import r2_score
# Creates a curve instead of a straight line
weights = np.polyfit(df_clean['PE Ratio'], df_clean['Price'], 2)
model_fn = np.poly1d(weights)

# Calculate R-squared value for the polynomial fit
y_pred = model_fn(df_clean['PE Ratio'])
r2_val = r2_score(df_clean['Price'], y_pred)

plt.figure(figsize=(12, 6))
plt.scatter(df_clean['PE Ratio'], df_clean['Price'], color='green', alpha=0.5, label='Actual Data')

# Draw the curve
xp = np.linspace(0, 700, 100)
plt.plot(xp, model_fn(xp), color='orange', linewidth=2, label=f'Polynomial Fit ($R^2$={r2_val:.4f})')

for i in range(len(df_clean)):
    symbol = df_clean.iloc[i]['Symbol']
    PERatio = df_clean.iloc[i]['PE Ratio']
    price = df_clean.iloc[i]['Price']

    if PERatio > 100 or price > 500:
        plt.annotate(symbol, (PERatio, price), xytext = (5,5), textcoords = 'offset points', fontsize = 9)

plt.title('PE Ratio vs. Stock Price')
plt.xlabel('PE Ratio (Sentiment)')
plt.ylabel('Stock Price ($)')
plt.legend()
plt.grid(True)
plt.show()


# In[94]:


# Third Model: Momentum vs Expectation (Price Change vs PE Ratio) 
# Testify if the companie' short-term performance (price change) can lead to the higher market expectation (PE Ratio)
plt.figure(figsize=(13, 6))

# Create a bubble chart to show the "success" of the stock, which is the stock price
plt.scatter(df_clean['Change'], df_clean['PE Ratio'], s=df_clean['Price']*0.8, alpha=0.5, c='teal', edgecolors='black')

# Create the standard line at change = 0
plt.axvline(0, color='red', linestyle='--', label='No Price Change')

# 4. Annotate the outliers
for i in range(len(df_clean)):
    if df_clean.iloc[i]['PE Ratio'] > 100 or abs(df_clean.iloc[i]['Change']) > 5:
        plt.annotate(df_clean.iloc[i]['Symbol'], 
                     (df_clean.iloc[i]['Change'], df_clean.iloc[i]['PE Ratio']),
                     xytext=(5, 5), textcoords='offset points', fontweight='bold')

plt.title('Market Momentum vs. Valuation Expectations')
plt.xlabel('Price Change (Short-term Performance)')
plt.ylabel('PE Ratio (Future Valuation Expectation)')
plt.grid(True)
plt.show()


# In[99]:


# Model 4: Efficiency Paradox (Success vs Concentration)
# It aims to disover the different typee of "success": Giant (massive market cap with relativeely low stock price), Small Elite (relative small market cap with high stock price)
# Calculate the efficiency ratio: Market cap per dollar of stock price, which reveals the 'weeight' of companies success
df_clean.loc[:, 'efficiencyRatio'] = df_clean['Market Cap (Billions)'] / df_clean['Price']

# Sort by efficiency from high to low
df_sort = df_clean.sort_values(by='efficiencyRatio', ascending=False)
df_sort


# In[100]:


# Create the bar chart
plt.figure(figsize=(14, 7))
bars = plt.bar(df_sort['Symbol'], df_sort['efficiencyRatio'], color='navy', alpha=0.8, edgecolor='black')

# Add two annotations for two feature companies
# Annotation A: The Scale Giants
# These companies have the highest structural weight.
plt.annotate('Tech Giant: Requires massive\nMarket Cap to support share price', 
             xy=('AAPL', 17), xytext=('MSFT', 18),
             arrowprops=dict(facecolor='black', shrink=0.05),
             fontsize=10, color='blue', fontweight='bold')

# Annotation B: The Agile Outliers
# These companies have almost no bar because their price is disconnected from scale.
plt.annotate('Hype Elite: High price supported\nby sentiment, not just scale', 
             xy=('SHOP', 0.12), xytext=(10, 10),
             arrowprops=dict(facecolor='red', shrink=0.05),
             fontsize=10, color='red', fontweight='bold')

plt.title('Efficiency Paradox (Market Cap per $1 of Stock Price)')
plt.xlabel('Stock Symbol')
plt.ylabel('Efficiency Ratio')
plt.xticks(rotation=45, ha='right', fontsize=9) 
plt.tight_layout()
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.show()

