'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus, Profile } from '@/types';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Flame, CheckCircle2, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-neutral-800' },
  { id: 'todo', label: 'To Do', color: 'border-blue-900/50' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-900/50' },
  { id: 'review', label: 'Review', color: 'border-purple-900/50' },
  { id: 'done', label: 'Done', color: 'border-emerald-900/50' },
];

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    let targetColumn = COLUMNS.find((col) => col.id === overId)?.id;

    if (!targetColumn) {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetColumn = overTask.status;
      }
    }

    if (targetColumn && targetColumn !== activeTaskItem.status) {
      onTaskMove(activeId, targetColumn, 0);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[calc(100vh-140px)] overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`bg-[#0F0F0F] border ${col.color} rounded-xl flex flex-col min-w-[260px] overflow-hidden shadow-lg`}
            >
              {/* Column Header */}
              <div className="p-3 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#262626] text-[#A3A3A3]">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(col.id)}
                  className="p-1 text-[#737373] hover:text-[#E10600] hover:bg-[#262626] rounded transition"
                  title="Add Task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Task Items List */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map((task) => (
                    <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                  ))}
                </SortableContext>

                {colTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-[11px] text-[#525252] border border-dashed border-[#262626] rounded-lg">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onClick={() => {}} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function TaskCard({ task, onClick, isDragging }: { task: Task; onClick: () => void; isDragging?: boolean }) {
  const priorityColors = {
    low: 'bg-[#1F1F1F] text-[#A3A3A3] border-[#262626]',
    medium: 'bg-blue-950/40 text-blue-300 border-blue-800/50',
    high: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    urgent: 'bg-[#7A0000]/60 text-red-200 border-[#E10600]',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3.5 bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#E10600]/40 rounded-lg cursor-pointer transition shadow-md group ${
        isDragging ? 'shadow-2xl border-[#E10600]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-white group-hover:text-[#FF3B3B] transition line-clamp-2">
          {task.title}
        </span>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
            priorityColors[task.priority] || priorityColors.medium
          }`}
        >
          {task.priority === 'urgent' && <Flame className="w-2.5 h-2.5 inline mr-0.5 text-[#E10600]" />}
          {task.priority}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.map((tag) => (
            <span key={tag} className="text-[9px] bg-[#0A0A0A] text-[#A3A3A3] px-1.5 py-0.5 rounded border border-[#262626]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F] text-[10px] text-[#737373]">
        <div className="flex items-center gap-1">
          {task.due_date && (
            <span className="flex items-center gap-1 text-[#A3A3A3]">
              <Clock className="w-3 h-3 text-[#E10600]" />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <div
              className="w-5 h-5 rounded-full bg-[#262626] border border-[#E10600]/50 text-white text-[9px] font-bold flex items-center justify-center"
              title={task.assignee.full_name}
            >
              {task.assignee.full_name.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <User className="w-3.5 h-3.5 text-[#525252]" />
          )}
        </div>
      </div>
    </div>
  );
}
