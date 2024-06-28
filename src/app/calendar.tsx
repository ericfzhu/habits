import moment from 'moment';
import React, { useCallback, useState } from 'react';
import { Calendar, Event, View, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

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
}

export default function ActivityCalendar({ activities }: ActivityCalendarProps) {
	const [currentView, setCurrentView] = useState<View>('month');

	const getMonthViewEvents = useCallback((): Event[] => {
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
	}, [activities]);

	const getWeekViewEvents = useCallback((): Event[] => {
		const events: Event[] = [];
		const dailySummary: { [date: string]: { [activityName: string]: number } } = {};

		activities.forEach((activity) => {
			if (Array.isArray(activity.timeBlocks)) {
				activity.timeBlocks.forEach((block) => {
					const startMoment = moment(block.start);
					const endMoment = moment(block.end);

					// Split the block into daily events
					let currentDay = startMoment.clone().startOf('day');
					while (currentDay.isSameOrBefore(endMoment)) {
						const nextDay = currentDay.clone().add(1, 'day');
						const eventStart = moment.max(currentDay, startMoment);
						const eventEnd = moment.min(nextDay.clone().subtract(1, 'minute'), endMoment);

						// Add individual time block
						events.push({
							title: activity.name,
							start: eventStart.toDate(),
							end: eventEnd.toDate(),
							resource: { ...activity, isTimeBlock: true },
						});

						// Accumulate for daily summary
						const date = currentDay.format('YYYY-MM-DD');
						if (!dailySummary[date]) {
							dailySummary[date] = {};
						}
						if (!dailySummary[date][activity.name]) {
							dailySummary[date][activity.name] = 0;
						}
						dailySummary[date][activity.name] += eventEnd.diff(eventStart);

						currentDay = nextDay;
					}
				});
			}
		});

		// Add daily summary events
		Object.entries(dailySummary).forEach(([date, activitiesForDay]) => {
			Object.entries(activitiesForDay).forEach(([activityName, duration]) => {
				const activity = activities.find((a) => a.name === activityName);
				if (activity) {
					events.push({
						title: `${activityName}: ${formatDuration(duration)}`,
						start: moment(date).startOf('day').toDate(),
						end: moment(date).endOf('day').toDate(),
						allDay: true,
						resource: { ...activity, isSummary: true },
					});
				}
			});
		});

		return events;
	}, [activities]);

	const formatDuration = (ms: number): string => {
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	};

	const eventStyleGetter = (event: Event) => {
		const resource = event.resource as Activity & { isTimeBlock?: boolean; isSummary?: boolean };
		const style: React.CSSProperties = {
			backgroundColor: resource.color,
			borderRadius: '5px',
			opacity: 0.8,
			color: 'white',
			border: 'none',
			display: 'block',
		};

		if (resource.isSummary) {
			style.backgroundColor = 'transparent';
			style.color = resource.color;
			style.border = `1px solid ${resource.color}`;
			style.borderRadius = '0';
			style.fontWeight = 'bold';
		}

		return { style };
	};

	const events = currentView === 'month' ? getMonthViewEvents() : getWeekViewEvents();

	return (
		<div style={{ height: '1000px' }}>
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				views={['month', 'week']}
				defaultView="month"
				style={{ height: '100%' }}
				eventPropGetter={eventStyleGetter}
				onView={(newView: View) => setCurrentView(newView)}
			/>
		</div>
	);
}
