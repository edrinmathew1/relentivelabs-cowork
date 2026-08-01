'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface FullCalendarWrapperProps {
  events: any[];
}

export default function FullCalendarWrapper({ events }: FullCalendarWrapperProps) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin as any, timeGridPlugin as any, interactionPlugin as any]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      events={events}
      height="calc(100vh - 280px)"
      editable={true}
      selectable={true}
      dayMaxEvents={3}
    />
  );
}
