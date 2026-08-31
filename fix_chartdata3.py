with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# Let's see if chartData exists
if "const chartData =" in content:
    print("chartData exists")
else:
    print("chartData DOES NOT exist")

# Let's insert it before the return if it doesn't exist
if "const chartData =" not in content:
    return_idx = content.find("  return (\n    <div className=\"flex flex-col gap-3")
    
    chart_data_code = """  const chartData = [
    { name: '1 May', Purchased: 20, Surveyed: 10, Won: 5 },
    { name: '8 May', Purchased: 25, Surveyed: 12, Won: 6 },
    { name: '15 May', Purchased: 23, Surveyed: 14, Won: 5 },
    { name: '22 May', Purchased: 28, Surveyed: 15, Won: 7 },
    { name: '29 May', Purchased: 26, Surveyed: 13, Won: 6 },
    { name: '5 Jun', Purchased: 30, Surveyed: 17, Won: 8 },
  ];

  const topLeads = leads.slice(0, 3);

"""
    new_content = content[:return_idx] + chart_data_code + content[return_idx:]
    with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
        f.write(new_content)
    print("Added chartData back")

