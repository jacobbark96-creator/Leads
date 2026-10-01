with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

# Let's see the context around both
first = content.find("const chartData = [")
print(content[first-100:first+100])
print("\n--- SECOND ---\n")
second = content.find("const chartData = [", first + 1)
print(content[second-100:second+100])
