# Evaluation of Tech Companies' Success

## 📌 Project Overview
Most U.S. technology companies are publicly traded, yet financial “success” cannot be defined by a single metric.
This project evaluates the success of publicly traded U.S. technology companies using data science methods,
focusing on the relationships between market capitalization, stock price, valuation metrics, and investor sentiment.

The analysis employs exploratory data analysis and regression modeling to identify the quantitative indicators that best explain perceived success in the technology sector.

---

## 🎯 Problem Statement
**Which financial indicators best explain the success of publicly traded U.S. technology companies?**

Rather than assuming that larger companies are more successful, this project examines nonlinear valuation effects, short-term momentum, and structural efficiency using real-world financial data.

---

## 🛠 Technology Stack
This project was implemented using the following data science tools and technologies:

- **Programming Language**
  - Python

- **Core Libraries**
  - `pandas` – data loading, cleaning, and manipulation  
  - `numpy` – numerical computation and feature engineering  
  - `matplotlib` – data visualization (scatter plots, regression lines, bubble charts, bar charts)

- **Modeling & Analysis**
  - Linear Regression (`scikit-learn`)
  - Polynomial Regression (`numpy.polyfit`)
  - Model evaluation using R²

- **Feature Engineering**
  - Efficiency Ratio (Market Capitalization per dollar of stock price)

- **Tools**
  - Python scripts (`.py`)
  - GitHub for version control and course project organization

---

## 📂 Data
- **Source:** *Top Tech Companies Stock Price* (Kaggle)
- **Scope:**
  - S&P 500 companies
  - Technology sector only
- **Initial size:** 100 companies
- **After cleaning:** 74 companies
- **Key variables:**
  - Market Capitalization
  - Stock Price
  - PE Ratio
  - Price Change
  - Derived efficiency metrics

---

## 📈 Methodology
1. **Data Cleaning**
   - Removed non-technology companies
   - Dropped records with missing financial values
   - Filtered out stocks priced below $5

2. **Exploratory Data Analysis**
   - Scatter plots to explore variable relationships
   - Bubble charts to represent multi-dimensional financial metrics
   - Bar charts to highlight structural differences among firms

3. **Modeling**
   - Linear regression to analyze Market Cap vs. Stock Price
   - Polynomial regression to capture nonlinear valuation effects
   - Derived metric analysis using Efficiency Ratio

---

## 🔍 Key Findings
- Market capitalization alone has **near-zero explanatory power** (R² ≈ 0.0004)
- PE Ratio significantly improves explanatory power (R² ≈ 0.49)
- High stock prices do not guarantee positive short-term momentum
- Two success archetypes emerge:
  - **Tech Giants** (scale-driven success)
  - **Hype Elites** (sentiment-driven success)

---

## 🚧 Limitations
- The dataset is approximately five years old
- External factors not included (product launches, management changes)
- No longitudinal time-series modeling for individual companies

---

## 🔮 Future Work
- Update the dataset with recent market data
- Incorporate time-series analysis
- Integrate external signals such as news and product releases
- Apply clustering or classification to identify success archetypes

---

## 📊 Presentation Slides
Slides used for the final course presentation:
- `slides/Evaluation_of_Tech_Companies_Success_YanboTong_20251220.pdf`

---

## 📚 References
- Li, S. (2025). *Momentum, volume and investor sentiment study for U.S. technology sector stocks*. **PLOS ONE**.
- Mantero, T. (2024). *Top Tech Companies Stock Price*. Kaggle Datasets.

---

## 📁 Repository Structure
```text
Evaluation of Tech Companies' Success/
├─ data/          # raw and cleaned datasets
├─ src/           # Python analysis scripts
├─ slides/        # presentation slides (PDF)
├─ results/       # figures and outputs
└─ README.md
