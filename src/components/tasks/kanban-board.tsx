'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus } from '@/types';
import { Plus, Clock, Flame, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onTaskDelete?: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="p-3 bg-[#141414] border border-[#262626] hover:border-[#E10600]/50 rounded-lg cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition space-y-2 group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-[#E10600] truncate">
          {task.project?.name || 'General'}
        </span>
        {task.priority === 'urgent' && (
          <span className="text-[10px] font-bold text-[#FF3B3B] bg-[#7A0000]/30 px-1.5 py-0.5 rounded border border-[#E10600] flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" /> Urgent
          </span>
        )}
      </div>

      <h4 className="text-xs font-bold text-white group-hover:text-[#FF3B3B] transition line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center justify-between text-[10px] text-[#A3A3A3] pt-1 border-t border-[#1F1F1F]">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#737373]" />
          <span>{formatDate(task.due_date)}</span>
        </div>
        <span className="font-semibold text-white">
          {task.assignee?.full_name?.split(' ')[0] || 'Unassigned'}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  column: { id: TaskStatus; label: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 flex flex-col justify-between min-h-[500px]"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#262626] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E10600]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              {column.label}
            </h3>
            <span className="text-[10px] font-mono text-[#A3A3A3] bg-[#141414] px-1.5 py-0.5 rounded border border-[#262626]">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={() => onAddTask(column.id)}
            className="text-[#A3A3A3] hover:text-white hover:bg-[#141414] p-1 rounded transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[400px]">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
            ))}
          </div>
        </SortableContext>
      </div>

      <button
        onClick={() => onAddTask(column.id)}
        className="w-full mt-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] border border-dashed border-[#262626] hover:border-[#E10600] rounded-lg text-[11px] font-semibold text-[#A3A3A3] hover:text-white transition flex items-center justify-center gap-1"
      >
        <Plus className="w-3.5 h-3.5 text-[#E10600]" /> Add Task
      </button>
    </div>
  );
}

function TrashDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash-dropzone' });

  return (
    <div
      ref={setNodeRef}
      className={`p-5 border-2 border-dashed rounded-xl transition flex items-center justify-center gap-3 text-xs font-bold ${
        isOver
          ? 'bg-[#7A0000] border-[#E10600] text-white scale-[1.03] shadow-2xl shadow-[#E10600]/40 ring-4 ring-[#E10600]/30'
          : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:text-[#FF3B3B] hover:border-[#7A0000]'
      }`}
    >
      <Trash2 className={`w-5 h-5 pointer-events-none ${isOver ? 'text-white animate-bounce' : 'text-[#E10600]'}`} />
      <span className="pointer-events-none">{isOver ? 'RELEASE MOUSE TO DELETE TASK NOW' : 'Drag any task card here to Delete'}</span>
    </div>
  );
}

// Custom collision detection prioritizing Trash drop zone if intersected
const customCollisionDetection: CollisionDetection = (args) => {
  const trashIntersection = rectIntersection({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (c) => c.id === 'trash-dropzone'
    ),
  });

  if (trashIntersection.length > 0) {
    return trashIntersection;
  }

  return closestCorners(args);
};

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask, onTaskDelete }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
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

    const taskId = active.id as string;
    const overId = over.id as string;

    // Handle Drop to Delete
    if (overId === 'trash-dropzone') {
      if (onTaskDelete) {
        onTaskDelete(taskId);
      }
      return;
    }

    let newStatus: TaskStatus | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus) {
      const columnTasks = tasks.filter((t) => t.status === newStatus);
      onTaskMove(taskId, newStatus, columnTasks.length);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter((t) => t.status === col.id)}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          ))}
        </div>

        {/* Drag and Drop Trash Delete Area */}
        <TrashDropZone />
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="p-3 bg-[#141414] border border-[#E10600] rounded-lg shadow-2xl space-y-1 w-64 opacity-90 scale-105">
            <h4 className="text-xs font-bold text-white">{activeTask.title}</h4>
            <span className="text-[10px] text-[#FF3B3B] font-mono">Dragging to Move or Delete</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
