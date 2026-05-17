const fs = require('fs');

const filePath = './src/app/(dashboard)/sales-crm/qualified/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const tableCode = `
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="w-12 py-2.5 px-4 text-center">
                    {profile?.role === 'super_admin' && (
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                      />
                    )}
                  </th>
                  <th className="py-2.5 px-4 const fs = require('fs');

const filePath = 'id