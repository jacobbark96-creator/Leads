with open('src/app/(dashboard)/client-portal/page.tsx', 'r') as f:
    content = f.read()

to_remove = """      <div className="mb-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          Welcome back, {profile?.name?.split(' ')[0] || 'Ioana'} <span className="text-xl">👋</span>
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">Here's what's happening with your leads today.</p>
      </div>"""

if to_remove in content:
    content = content.replace(to_remove, "")
    with open('src/app/(dashboard)/client-portal/page.tsx', 'w') as f:
        f.write(content)
    print("Removed welcome block from page.tsx")
else:
    print("Could not find welcome block in page.tsx")
