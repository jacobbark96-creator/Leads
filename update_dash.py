import re

with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

return_idx = content.find('  return (\n    <div')
end_idx = content.rfind('}')

# Load the file content
with open('dashboard_template.txt', 'r') as f:
    new_return = f.read()

new_content = content[:return_idx] + new_return + "\n}\n"

with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
    f.write(new_content)
print("Updated dashboard aesthetics")
