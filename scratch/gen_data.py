import pandas as pd
import numpy as np

def generate_realistic_data(n=500):
    np.random.seed(42)
    
    # Skewed Salary (Log-normal distribution)
    # Mean around 65k, but long tail up to 200k
    salary = np.random.lognormal(mean=11.0, sigma=0.4, size=n)
    salary = (salary * 1.5).astype(int) # Adjust to realistic scale
    
    # Clip to realistic range
    salary = np.clip(salary, 35000, 220000)
    
    departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'R&D']
    dept_weights = [0.3, 0.15, 0.2, 0.1, 0.1, 0.1, 0.05]
    
    data = {
        'Employee_ID': [f'EMP-{1000+i}' for i in range(n)],
        'Department': np.random.choice(departments, size=n, p=dept_weights),
        'Salary': salary,
        'Experience_Years': np.random.randint(1, 20, size=n),
        'Performance_Score': np.random.normal(75, 12, size=n).clip(40, 100).astype(int),
        'Stability_Index': np.random.uniform(0.4, 0.98, size=n),
        'Projects_Completed': (salary / 5000 + np.random.normal(5, 10, size=n)).clip(1, 100).astype(int)
    }
    
    # Add some outliers (Anomalies)
    # 1. Very high salary with very low experience
    data['Salary'][10] = 195000
    data['Experience_Years'][10] = 1
    
    # 2. High performance but very low salary
    data['Performance_Score'][50] = 98
    data['Salary'][50] = 42000
    
    # 3. Very low stability (Simulated risk)
    data['Stability_Index'][99] = 0.12
    
    df = pd.DataFrame(data)
    df.to_csv('frontend/public/sample_data_v2.csv', index=False)
    print(f"Generated {n} records in frontend/public/sample_data_v2.csv")

if __name__ == "__main__":
    generate_realistic_data(100)
