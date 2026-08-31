import re

# 1. Fix MainLayout.tsx header
with open('src/components/MainLayout.tsx', 'r') as f:
    layout = f.read()

# Replace header absolute positioning
old_header_class = 'className="hidden lg:flex h-24 items-center justify-between px-8 absolute top-0 right-0 left-0 lg:left-[240px] z-10 pointer-events-none"'
new_header_class = 'className="hidden lg:flex h-24 items-center justify-between px-8 z-10"'

layout = layout.replace(old_header_class, new_header_class)

# Remove pointer-events-auto from children of header
layout = layout.replace('pointer-events-auto mt-4', 'mt-4')
layout = layout.replace('pointer-events-auto bg-white/50', 'bg-white/50')

# Update main padding
old_main_class = 'className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 pt-20 lg:pt-24 z-0"'
new_main_class = 'className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 lg:pt-4 z-0"'
layout = layout.replace(old_main_class, new_main_class)

with open('src/components/MainLayout.tsx', 'w') as f:
    f.write(layout)
print("Updated MainLayout.tsx")

