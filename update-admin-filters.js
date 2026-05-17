const fs = require('fs');

const pagePath = './src/app/(dashboard)/admin-crm/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const replacementImports = `import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Ban, Shield, Users, Briefcase, X } from 'lucide-react';
import { UserDetailsModal } from '@/components/UserDetailsModal';`;

const replacementState = `  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'client', password: '' });`;

const replacementCreateLogic = `      toast.success('User created successfully. They will need to verify their email.');
      setNewUser({ email: '', name: '', role: 'client',const fs = require('fs');

const pagePath = './s     fetchUsers();`;

const replacemelet content = fs.readFileSync(pagePath, 'utf8');

const repn