import moment from 'moment';
import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface Activity {
	id: string;
	name: string;
	timeSpent: { [date: string]: number };
	isDeleted: boolean;
	color: string;
}

interface CalendarEvent {
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	resource: Activity;
}

interface ActivityCalendarProps {
	activities: Activity[];
}

export default function ActivityCalendar({ activities }: ActivityCalendarProps) {
	const events: CalendarEvent[] = activities.flatMap((activity) =>
		Object.entries(activity.timeSpent).map(([date, duration]) => ({
			title: `${activity.name} (${Math.round(duration / 60)} min)`,
			start: new Date(date),
			end: new Date(date),
			allDay: true,
			resource: activity,
		})),
	);

	const eventStyleGetter = (event: CalendarEvent) => {
		const style = {
			backgroundColor: event.resource.color,
			borderRadius: '5px',
			opacity: 0.8,
			color: 'white',
			border: 'none',
			display: 'block',
		};
		return {
			style: style,
		};
	};

	return (
		<div style={{ height: '500px' }}>
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				style={{ height: '100%' }}
				eventPropGetter={eventStyleGetter}
			/>
		</div>
	);
}
