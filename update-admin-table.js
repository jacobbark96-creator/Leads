const fs = require('fs');

const pagePath = './src/app/(dashboard)/admin-crm/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const tableCode = `
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 py-2.5 px-4 text-center"></th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">User</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Role</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Joined</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors group hover:bg-gray-50/80 bg-white">
                  <td className="py-3 px-4 text-center">
                    {/* Checkbox placeholder for alignment */}
                  </td>
                  
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0 border border-blue-200">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3 px-4">
                    <select
                      disabled={user.id === profile?.id}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={\`text-[11px] font-bold rounded-full px-2 py-1 border shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500
                        \${user.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                          user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                          user.role === 'sales' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          user.role === 'rep' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-gray-50 text-gray-700 border-gray-200'}\`}
                    >
                      <option value="client">Contractor / Client</option>
                      <option value="rep">Representative</option>
                      <option value="sales">Sales Staff</option>
                      <option value="admin">Admin</option>
                      {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </td>
                  
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-900 font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {profile?.role === 'super_admin' && user.id !== profile.id && (
                        <>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete user (can sign up again)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBanUser(user.id, user.email)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Ban user permanently"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
`;

const startTag = '<div className="flex flex-col">';
const endTag = '      </div>\n\n      {selectedUser && (';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + tableCode + content.substring(endIndex);
  fs.writeFileSync(pagePath, content);
  console.log("Admin table replaced successfully!");
} else {
  console.log("Could not find start/end tags");
}
