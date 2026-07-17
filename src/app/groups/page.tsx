"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/Avatar";
import { showToast } from "@/lib/feedback/toast";
import { createGroup, deleteGroup, getGroups, updateGroup } from "@/lib/session/groups";
import { getSuggestedParticipants } from "@/lib/session/recentParticipants";
import type { Group } from "@/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this sync-on-mount is the
    // external-system case the lint rule means to exempt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroups(getGroups());
    setSuggestions(getSuggestedParticipants());
  }, []);

  function handleCreate() {
    const group = createGroup("New group", []);
    setGroups(getGroups());
    setEditingId(group.id);
  }

  function handleDelete(group: Group) {
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    deleteGroup(group.id);
    showToast({
      message: `"${group.name}" deleted`,
      actionLabel: "Undo",
      onAction: () => {
        createGroup(group.name, group.memberNames);
        setGroups(getGroups());
      },
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/" className="text-sm font-medium text-accent">
            ← Back
          </Link>
        }
      />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Groups</h1>
        <button
          type="button"
          onClick={handleCreate}
          className="text-sm font-medium text-accent"
        >
          + New group
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Save the people you split with often, so you can add everyone to a new
        bill in one tap instead of typing names each time.
      </p>

      {groups.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <GroupIcon className="h-10 w-10 text-muted" />
          <p className="text-sm text-muted">No groups yet</p>
          <button
            type="button"
            onClick={handleCreate}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {groups.map((group) =>
            editingId === group.id ? (
              <GroupEditor
                key={group.id}
                group={group}
                suggestions={suggestions}
                onDone={() => {
                  setGroups(getGroups());
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={group.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{group.name}</p>
                    <p className="text-xs text-muted">
                      {group.memberNames.length === 0
                        ? "No members yet"
                        : group.memberNames.join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(group.id)}
                      className="text-sm font-medium text-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(group)}
                      className="text-sm font-medium text-muted"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {group.memberNames.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.memberNames.map((name) => (
                      <div key={name} className="flex items-center gap-1.5">
                        <Avatar id={name} name={name} size={22} />
                        <span className="text-xs text-text">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      )}
    </main>
  );
}

function GroupEditor({
  group,
  suggestions,
  onDone,
}: {
  group: Group;
  suggestions: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [members, setMembers] = useState(group.memberNames);
  const [newName, setNewName] = useState("");

  function addMember(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return;
    setMembers((prev) => [...prev, trimmed]);
    setNewName("");
  }

  function removeMember(value: string) {
    setMembers((prev) => prev.filter((m) => m !== value));
  }

  function handleSave() {
    updateGroup(group.id, { name, memberNames: members });
    onDone();
  }

  const availableSuggestions = suggestions.filter(
    (name) => !members.some((m) => m.toLowerCase() === name.toLowerCase()),
  );

  return (
    <div className="card p-4">
      <label className="text-sm text-muted" htmlFor="group-name">
        Group name
      </label>
      <input
        id="group-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Barkada"
        className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
      />

      <p className="mb-1.5 mt-3 text-sm text-muted">Members</p>
      {members.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => removeMember(m)}
              className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text"
            >
              {m} ×
            </button>
          ))}
        </div>
      ) : null}

      {availableSuggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSuggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addMember(name)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-accent"
            >
              + {name}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMember(newName);
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a member by name"
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-medium text-accent disabled:opacity-60"
        >
          Add
        </button>
      </form>

      <button
        type="button"
        onClick={handleSave}
        className="btn-primary mt-3 w-full px-4 py-2 text-sm font-medium"
      >
        Save group
      </button>
    </div>
  );
}

function GroupIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
