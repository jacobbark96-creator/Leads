with open('src/components/MainLayout.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'absolute top-0 right-0 left-0 z-10 pointer-events-none',
    'absolute top-0 right-0 left-0 lg:left-[240px] z-10 pointer-events-none'
)

with open('src/components/MainLayout.tsx', 'w') as f:
    f.write(content)
print("Updated MainLayout.tsx header")
