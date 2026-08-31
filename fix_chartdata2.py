with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# My previous script replaced from `return (` but left the old `const chartData = [` and `const topLeads =` which I inserted before the return previously!
# So I need to find the FIRST `const chartData = [` and replace from there.

first_chart = content.find("  const chartData = [")
return_idx = content.find("  return (\n    <div className=\"flex flex-col gap-3", first_chart)
end_of_file = content.rfind("}")

new_content = content[:first_chart] + content[return_idx:end_of_file+1]

with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
    f.write(new_content)

print("Fixed!")
