import moment from 'moment';
import React, { useState } from 'react';
import { Calendar, Event, View, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

interface TimeBlock {
	start: number;
	end: number;
}

interface Activity {
	id: string;
	name: string;
	timeBlocks: TimeBlock[];
	isDeleted: boolean;
	color: string;
}

interface ActivityCalendarProps {
	activities: Activity[];
	onUpdateTimeBlock: (activityId: string, oldTimeBlock: TimeBlock, newTimeBlock: TimeBlock) => void;
}

export default function ActivityCalendar({ activities, onUpdateTimeBlock }: ActivityCalendarProps) {
	const [currentView, setCurrentView] = useState<View>('month');

	function getMonthViewEvents(): Event[] {
		const events: Event[] = [];
		const dailySummary: { [date: string]: { [activityName: string]: number } } = {};

		activities.forEach((activity) => {
			if (Array.isArray(activity.timeBlocks)) {
				activity.timeBlocks.forEach((block) => {
					const date = moment(block.start).format('YYYY-MM-DD');
					if (!dailySummary[date]) {
						dailySummary[date] = {};
					}
					if (!dailySummary[date][activity.name]) {
						dailySummary[date][activity.name] = 0;
					}
					dailySummary[date][activity.name] += block.end - block.start;
				});
			}
		});

		Object.entries(dailySummary).forEach(([date, activitiesForDay]) => {
			Object.entries(activitiesForDay).forEach(([activityName, duration]) => {
				const activity = activities.find((a) => a.name === activityName);
				if (activity) {
					events.push({
						title: `${activityName}: ${formatDuration(duration)}`,
						start: new Date(date),
						end: new Date(date),
						allDay: true,
						resource: activity,
					});
				}
			});
		});

		return events;
	}

	function getWeekViewEvents(): Event[] {
		return activities.flatMap((activity) =>
			activity.timeBlocks.map((block) => ({
				title: activity.name,
				start: new Date(block.start),
				end: new Date(Math.min(block.end, moment(block.start).endOf('day').valueOf())),
				resource: { activity, timeBlock: block },
			})),
		);
	}

	function formatDuration(ms: number): string {
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	}

	function eventStyleGetter(event: Event) {
		const resource = event.resource as Activity | { activity: Activity };
		const color = 'activity' in resource ? resource.activity.color : resource.color;
		return {
			style: {
				backgroundColor: color,
				borderRadius: '5px',
				opacity: 0.8,
				color: 'white',
				border: 'none',
				display: 'block',
			},
		};
	}

	function handleEventDrop({ event, start, end }: { event: Event; start: Date; end: Date }) {
		const { activity, timeBlock } = event.resource as { activity: Activity; timeBlock: TimeBlock };
		const newTimeBlock: TimeBlock = {
			start: start.getTime(),
			end: end.getTime(),
		};
		onUpdateTimeBlock(activity.id, timeBlock, newTimeBlock);
	}

	function handleEventResize({ event, start, end }: { event: Event; start: Date; end: Date }) {
		const { activity, timeBlock } = event.resource as { activity: Activity; timeBlock: TimeBlock };
		const newTimeBlock: TimeBlock = {
			start: start.getTime(),
			end: end.getTime(),
		};
		onUpdateTimeBlock(activity.id, timeBlock, newTimeBlock);
	}

	const events = currentView === 'month' ? getMonthViewEvents() : getWeekViewEvents();

	return (
		<div style={{ height: '1000px' }}>
			<DnDCalendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				views={['month', 'week']}
				defaultView="month"
				style={{ height: '100%' }}
				eventPropGetter={eventStyleGetter}
				onView={(newView: View) => setCurrentView(newView)}
				onEventDrop={handleEventDrop}
				onEventResize={handleEventResize}
				resizable={currentView === 'week'}
				draggableAccessor={() => currentView === 'week'}
			/>
		</div>
	);
}
