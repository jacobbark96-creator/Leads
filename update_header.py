with open('src/components/MainLayout.tsx', 'r') as f:
    content = f.read()

# Replace the header section
old_header = """          {/* Desktop Header */}
          <header className="hidden lg:flex h-20 items-center justify-end px-8 absolute top-0 right-0 left-0 z-10 pointer-events-none">
            <div className="flex items-center gap-4 pointer-events-auto bg-white/50 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/20">"""

new_header = """          {/* Desktop Header */}
          <header className="hidden lg:flex h-24 items-center justify-between px-8 absolute top-0 right-0 left-0 z-10 pointer-events-none">
            <div className="flex flex-col pointer-events-auto mt-4">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Welcome back, {clientName?.split(' ')[0] || profile.name?.split(' ')[0] || 'Ioana'} <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Here's what's happening with your leads today.</p>
            </div>
            
            <div className="flex items-center gap-4 pointer-events-auto bg-white/50 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/20 mt-4">"""

if old_header in content:
    content = content.replace(old_header, new_header)
    with open('src/components/MainLayout.tsx', 'w') as f:
        f.write(content)
    print("Updated MainLayout.tsx")
else:
    print("Could not find old_header in MainLayout.tsx")
