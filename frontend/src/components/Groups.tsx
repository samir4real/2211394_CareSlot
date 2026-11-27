
import React, { useState } from 'react';

interface GroupMember {
  id: number;
  name: string;
  email: string;
  permissions: string[];
}

interface Group {
  id: number;
  name: string;
  description: string;
  owner: string;
  members: GroupMember[];
  appointments: number;
}

const initialGroups: Group[] = [
  {
    id: 1,
    name: 'Family Care',
    description: 'Shared appointments for family members',
    owner: 'You',
    appointments: 12,
    members: [
      { id: 1, name: 'You', email: 'owner@careslot.com', permissions: ['View', 'Create', 'Update', 'Assign'] },
      { id: 2, name: 'Rahim Ahmed', email: 'rahim@example.com', permissions: ['Create', 'Update'] },
      { id: 3, name: 'Nusrat Jahan', email: 'nusrat@example.com', permissions: ['Assign'] },
      { id: 4, name: 'Karim Hasan', email: 'karim@example.com', permissions: ['View'] },
    ],
  },
  {
    id: 2,
    name: 'Clinic Team',
    description: 'Appointment coordination team',
    owner: 'You',
    appointments: 8,
    members: [
      { id: 5, name: 'You', email: 'owner@careslot.com', permissions: ['View', 'Create', 'Update', 'Assign'] },
      { id: 6, name: 'Dr. Sarah', email: 'sarah@example.com', permissions: ['View', 'Assign'] },
    ],
  },
  {
    id: 3,
    name: 'Patient Support',
    description: 'Patient appointment support group',
    owner: 'You',
    appointments: 5,
    members: [
      { id: 7, name: 'You', email: 'owner@careslot.com', permissions: ['View', 'Create', 'Update', 'Assign'] },
    ],
  },
];

const permissionOptions = ['View', 'Create', 'Update', 'Assign'];

interface GroupsProps {
  darkMode: boolean;
  userName: string;
}

export default function Groups({ darkMode, userName }: GroupsProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPermissions, setMemberPermissions] = useState<string[]>(['View']);

  const card = darkMode
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';

  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const input = darkMode
    ? 'bg-slate-950 border-slate-700 text-white'
    : 'bg-white border-slate-300 text-slate-900';

  const currentGroup = groups.find(g => g.id === selectedGroup);

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setGroups(prev => [...prev, {
      id: Date.now(),
      name: groupName,
      description,
      owner: userName,
      appointments: 0,
      members: [{
        id: Date.now(),
        name: userName,
        email: 'you@careslot.com',
        permissions: permissionOptions,
      }],
    }]);

    setGroupName('');
    setDescription('');
    setShowCreate(false);
  };

  const addMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !memberName.trim() || !memberEmail.trim()) return;

    setGroups(prev => prev.map(group =>
      group.id === currentGroup.id
        ? {
            ...group,
            members: [...group.members, {
              id: Date.now(),
              name: memberName,
              email: memberEmail,
              permissions: memberPermissions,
            }],
          }
        : group
    ));

    setMemberName('');
    setMemberEmail('');
    setMemberPermissions(['View']);
    setShowMemberForm(false);
  };

  const removeMember = (memberId: number) => {
    setGroups(prev => prev.map(group =>
      group.id === selectedGroup
        ? { ...group, members: group.members.filter(m => m.id !== memberId) }
        : group
    ));
  };

  const togglePermission = (permission: string) => {
    setMemberPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const badgeColor = (permission: string) => {
    const colors: Record<string, string> = {
      View: 'bg-slate-500/15 text-slate-400',
      Create: 'bg-emerald-500/15 text-emerald-400',
      Update: 'bg-amber-500/15 text-amber-400',
      Assign: 'bg-indigo-500/15 text-indigo-400',
    };
    return colors[permission];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Group Management</h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Share appointments and manage member permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
        >
          + Create Group
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Groups', value: groups.length },
          { label: 'Total Members', value: groups.reduce((sum, g) => sum + g.members.length, 0) },
          { label: 'Shared Appointments', value: groups.reduce((sum, g) => sum + g.appointments, 0) },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-5 ${card}`}>
            <p className={`text-sm ${muted}`}>{stat.label}</p>
            <p className="text-3xl font-extrabold mt-2 text-indigo-400">{stat.value}</p>
          </div>
        ))}
      </div>

      {currentGroup ? (
        <div className={`rounded-2xl border p-6 ${card} space-y-5`}>
          <button onClick={() => { setSelectedGroup(null); setShowMemberForm(false); }}
            className="text-sm text-indigo-400 font-semibold">
            ← Back to Groups
          </button>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{currentGroup.name}</h2>
              <p className={`text-sm mt-1 ${muted}`}>{currentGroup.description}</p>
              <p className={`text-xs mt-2 ${muted}`}>Owner: {currentGroup.owner}</p>
            </div>
            <button onClick={() => setShowMemberForm(!showMemberForm)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
              + Add Member
            </button>
          </div>

          {showMemberForm && (
            <form onSubmit={addMember} className="rounded-xl border border-indigo-500/30 p-4 space-y-3">
              <h3 className="font-bold">Add Group Member</h3>
              <input required placeholder="Member name" value={memberName}
                onChange={e => setMemberName(e.target.value)}
                className={`w-full rounded-xl border p-3 text-sm ${input}`} />
              <input required type="email" placeholder="Member email" value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)}
                className={`w-full rounded-xl border p-3 text-sm ${input}`} />
              <p className="text-sm font-semibold">Permissions</p>
              <div className="flex flex-wrap gap-3">
                {permissionOptions.map(permission => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={memberPermissions.includes(permission)}
                      onChange={() => togglePermission(permission)} />
                    {permission}
                  </label>
                ))}
              </div>
              <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">
                Add Member
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-4">
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <p className={`text-xs ${muted}`}>Members</p>
              <p className="text-2xl font-bold">{currentGroup.members.length}</p>
            </div>
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <p className={`text-xs ${muted}`}>Shared Appointments</p>
              <p className="text-2xl font-bold">{currentGroup.appointments}</p>
            </div>
          </div>

          <h3 className="font-bold text-lg">Members & Permissions</h3>
          {currentGroup.members.map(member => (
            <div key={member.id} className={`rounded-xl border p-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{member.name}</p>
                  <p className={`text-xs mt-1 ${muted}`}>{member.email}</p>
                </div>
                {member.name !== userName && (
                  <button onClick={() => removeMember(member.id)}
                    className="text-xs text-red-400 font-semibold">
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {member.permissions.map(permission => (
                  <span key={permission} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeColor(permission)}`}>
                    {permission} appointments
                  </span>
                ))}
                {member.permissions.length === 0 && (
                  <span className={`text-xs ${muted}`}>No permissions assigned</span>
                )}
              </div>
            </div>
          ))}

          <h3 className="font-bold text-lg">Shared Appointments</h3>
          <div className={`rounded-xl border p-5 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-sm ${muted}`}>
              Appointment records shared with this group will appear here.
            </p>
            <p className="text-2xl font-bold mt-2">{currentGroup.appointments} appointments</p>
            <span className={`text-xs ${muted}`}>Sample data · Not connected to the backend</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(group => (
            <button key={group.id} onClick={() => setSelectedGroup(group.id)}
              className={`text-left rounded-2xl border p-6 hover:border-indigo-500 transition ${card}`}>
              <div className="flex justify-between items-start">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-xl">👥</div>
                <span className="text-xs text-indigo-400 font-semibold">Owner: {group.owner}</span>
              </div>
              <h2 className="font-bold text-lg mt-4">{group.name}</h2>
              <p className={`text-sm mt-1 ${muted}`}>{group.description}</p>
              <div className={`flex justify-between mt-6 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`text-xs ${muted}`}>{group.members.length} members</span>
                <span className={`text-xs ${muted}`}>{group.appointments} appointments</span>
              </div>
              <p className="text-xs text-indigo-400 font-semibold mt-4">Manage Group →</p>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={createGroup} className={`w-full max-w-md rounded-2xl border p-6 space-y-4 ${card}`}>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Create New Group</h2>
              <button type="button" onClick={() => setShowCreate(false)} className={muted}>✕</button>
            </div>
            <input required placeholder="Group name" value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm ${input}`} />
            <textarea placeholder="Description (optional)" value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full rounded-xl border p-3 text-sm ${input}`} />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)}
                className={`px-4 py-2 rounded-xl text-sm ${muted}`}>Cancel</button>
              <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
