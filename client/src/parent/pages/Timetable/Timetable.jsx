import React, { useState } from 'react';

const WeeklySchedule = () => {
    // State for current day (highlighted)
    const [currentDay] = useState(new Date().getDay());

    // Time slots for the schedule
    const timeSlots = [
        '05:00', '06:00', '07:00', '08:00', '09:00', '10:00',
        '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
        '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
    ];

    // Days of the week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Events for the week
    const events = [
        { id: 1, title: 'Gardening', day: 1, startTime: '09:00', endTime: '10:00', color: 'bg-green-400' },
        { id: 2, title: 'Cooking Class', day: 2, startTime: '19:00', endTime: '20:00', color: 'bg-blue-400' },
        { id: 3, title: 'Meet Dan for Lunch', day: 4, startTime: '12:00', endTime: '13:00', color: 'bg-purple-400' }
    ];

    // Today's online classes
    const onlineClasses = [
        { id: 1, time: '05:00 - 06:30', subject: 'Mathematics' },
        { id: 2, time: '06:30 - 08:15', subject: 'History' },
        { id: 3, time: '08:30 - 09:15', subject: 'Science' }
    ];

    // Calculate the position and height of an event based on time
    const calculateEventStyle = (startTime, endTime) => {
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const endHour = parseInt(endTime.split(':')[0]);
        const endMinute = parseInt(endTime.split(':')[1]);

        const startOffset = (startHour - 5) * 60 + startMinute;
        const duration = (endHour - startHour) * 60 + (endMinute - startMinute);

        const top = (startOffset / 60) * 60; // 60px per hour
        const height = (duration / 60) * 60; // 60px per hour

        return {
            top: `${top}px`,
            height: `${height}px`
        };
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Weekly Schedule</h1>

                    {/* Today's Online Classes */}
                    <div className="bg-white rounded-lg shadow-md p-4 w-64">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Today's Online Classes</h2>
                        <div className="space-y-3">
                            {onlineClasses.map(cls => (
                                <div key={cls.id} className="border-l-4 border-indigo-500 pl-3">
                                    <div className="text-sm font-medium text-gray-900">Class {cls.id}</div>
                                    <div className="text-xs text-gray-500">{cls.time}</div>
                                    <div className="text-sm text-gray-700">{cls.subject}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Weekly Schedule Grid */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="grid grid-cols-8">
                        {/* Empty corner cell */}
                        <div className="p-2 border-r border-b bg-gray-100"></div>

                        {/* Day headers */}
                        {days.map((day, index) => (
                            <div
                                key={day}
                                className={`p-2 text-center font-semibold border-r border-b ${index === currentDay - 1 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}

                        {/* Time slots and events */}
                        {timeSlots.map(time => (
                            <React.Fragment key={time}>
                                {/* Time label */}
                                <div className="p-2 text-xs text-gray-500 border-r border-b text-right pr-4">
                                    {time}
                                </div>

                                {/* Day cells */}
                                {days.map((day, dayIndex) => (
                                    <div key={`${day}-${time}`} className="relative border-r border-b h-15" style={{ height: '60px' }}>
                                        {/* Render events that match this day and time */}
                                        {events.map(event => {
                                            if (event.day === dayIndex) {
                                                const eventStartHour = parseInt(event.startTime.split(':')[0]);
                                                const eventEndHour = parseInt(event.endTime.split(':')[0]);
                                                const currentHour = parseInt(time.split(':')[0]);

                                                if (currentHour >= eventStartHour && currentHour < eventEndHour) {
                                                    const style = calculateEventStyle(event.startTime, event.endTime);
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={`absolute left-0 right-0 mx-1 p-1 rounded text-xs text-white ${event.color} overflow-hidden`}
                                                            style={style}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    );
                                                }
                                            }
                                            return null;
                                        })}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklySchedule;