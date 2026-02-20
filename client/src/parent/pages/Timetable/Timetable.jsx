import React, { useState } from 'react';

const WeeklySchedule = () => {
    const [currentDay] = useState(new Date().getDay()); // 0=Sun,1=Mon,...

    // 30-min slots from 08:00 to 17:30
    const timeSlots = [];
    for (let h = 8; h <= 17; h++) {
        timeSlots.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 18) timeSlots.push(`${String(h).padStart(2, '0')}:30`);
    }

    // Days: Sunday first
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Events: day 0=Sun,1=Mon,...
    const events = [
        { id: 1, title: 'Gardening', day: 2, startTime: '09:00', endTime: '10:30', color: '#bbf7d0', textColor: '#166534' },
        { id: 2, title: "Monday Morning, let's...", day: 1, startTime: '09:30', endTime: '11:00', color: '#fed7aa', textColor: '#9a3412' },
        { id: 3, title: 'Appear busy', day: 1, startTime: '10:00', endTime: '11:30', color: '#fecaca', textColor: '#991b1b' },
        { id: 4, title: 'Cooking Class', day: 4, startTime: '10:00', endTime: '11:30', color: '#c4b5fd', textColor: '#4c1d95' },
        { id: 5, title: 'Laundry', day: 5, startTime: '10:00', endTime: '11:30', color: '#bbf7d0', textColor: '#166534' },
        { id: 6, title: 'Call Mum!', day: 1, startTime: '13:00', endTime: '13:30', color: '#d1fae5', textColor: '#065f46' },
        { id: 7, title: 'Keep titles short', day: 2, startTime: '14:00', endTime: '14:30', color: '#dbeafe', textColor: '#1e40af' },
        { id: 8, title: 'Buy Icecream', day: 2, startTime: '14:30', endTime: '15:00', color: '#fef9c3', textColor: '#854d0e' },
        { id: 9, title: 'Meet Dan for Lunch', day: 5, startTime: '12:30', endTime: '13:30', color: '#bfdbfe', textColor: '#1e40af' },
    ];

    // Convert "HH:MM" to minutes since 08:00
    const toMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return (h - 8) * 60 + m;
    };

    const SLOT_HEIGHT = 28; // px per 30-min slot
    const SLOT_MINUTES = 30;

    // Get events for a specific day, with top/height in px
    const getEventsForDay = (dayIndex) => {
        return events
            .filter(e => e.day === dayIndex)
            .map(e => {
                const startMin = toMinutes(e.startTime);
                const endMin = toMinutes(e.endTime);
                const top = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
                const height = ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT;
                return { ...e, top, height };
            });
    };

    // Today's Online Classes (right panel)
    const onlineClasses = [
        { id: 1, time: '05:00 - 06:30', subject: 'Subject' },
        { id: 2, time: '06:30 - 07:30', subject: 'Subject' },
        { id: 3, time: '08:30 - 09:15', subject: 'Subject' },
    ];

    const totalHeight = timeSlots.length * SLOT_HEIGHT;

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="flex gap-4 items-start">

                {/* ── Main Schedule Grid ── */}
                <div className="flex-1 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                    {/* Day Headers */}
                    <div className="flex border-b border-gray-200">
                        {/* Time gutter header */}

                        {days.map((day, idx) => (
                            <div
                                key={day}
                                className="flex-1 text-center py-2 text-sm font-semibold border-r border-gray-200 last:border-r-0"
                                style={{
                                    color: idx === currentDay ? '#2563eb' : '#374151',
                                    background: idx === 0 ? '#fff1f2' : idx === currentDay ? '#eff6ff' : '#fff',
                                }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="flex" style={{ height: `${totalHeight}px` }}>


                        {/* Day Columns */}
                        {days.map((day, dayIdx) => {
                            const dayEvents = getEventsForDay(dayIdx);
                            return (
                                <div
                                    key={day}
                                    className="flex-1 relative border-r border-gray-200 last:border-r-0"
                                    style={{
                                        background: dayIdx === 0 ? '#fff1f2' : '#fff',
                                    }}
                                >
                                    {/* Horizontal slot lines */}
                                    {timeSlots.map((slot) => (
                                        <div
                                            key={slot}
                                            className="border-b border-gray-100"
                                            style={{ height: `${SLOT_HEIGHT}px` }}
                                        >
                                            {/* Time label inside cell (like the image) */}
                                            <span
                                                className="text-gray-300 pl-0.5"
                                                style={{ fontSize: '9px', lineHeight: `${SLOT_HEIGHT}px` }}
                                            >
                                                {slot}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Events */}
                                    {dayEvents.map(ev => (
                                        <div
                                            key={ev.id}
                                            className="absolute left-0.5 right-0.5 rounded overflow-hidden px-1 py-0.5"
                                            style={{
                                                top: `${ev.top}px`,
                                                height: `${ev.height}px`,
                                                background: ev.color,
                                                zIndex: 10,
                                            }}
                                        >
                                            <p
                                                className="font-semibold truncate"
                                                style={{ fontSize: '10px', color: ev.textColor, lineHeight: '14px' }}
                                            >
                                                {ev.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Today's Online Classes Panel ── */}
                <div className="flex-shrink-0 bg-white rounded-lg shadow border border-gray-200 p-3" style={{ width: '160px' }}>
                    <h2 className="text-xs font-bold text-blue-600 mb-3 leading-tight">
                        Today's Online Classes
                    </h2>
                    <div className="space-y-3">
                        {onlineClasses.map(cls => (
                            <div key={cls.id}>
                                <p className="text-gray-500 mb-1" style={{ fontSize: '10px' }}>{cls.time}</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-0.5 h-8 bg-blue-600 rounded-full flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800">Class {cls.id}</p>
                                        <p className="text-gray-500" style={{ fontSize: '10px' }}>{cls.subject}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WeeklySchedule;