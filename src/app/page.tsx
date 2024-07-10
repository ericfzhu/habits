'use client';

import {
	Bell,
	ChevronDown,
	Download,
	Edit2,
	Eye,
	EyeOff,
	MessageSquare,
	MoreHorizontal,
	PlayCircle,
	PlusCircle,
	Search,
	StopCircle,
	Trash2,
	Upload,
} from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import React, { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Line, LineChart } from 'recharts';

import ActivityCalendar from './calendar';

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

interface TimerState {
	[activityId: string]: number | null;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const MERGE_THRESHOLD = 10 * 60 * 1000;

interface EditHabitsModalProps {
	activities: Activity[];
	onClose: () => void;
	onUpdateTimeBlock: (activityId: string, timeBlockIndex: number, field: 'start' | 'end', value: string) => void;
}

function EditHabitsModal({ activities, onClose, onUpdateTimeBlock }: EditHabitsModalProps) {
	const sortedActivities = useMemo(() => {
		return [...activities].sort((a, b) => {
			const aLatest = Math.max(...a.timeBlocks.map((block) => block.start));
			const bLatest = Math.max(...b.timeBlocks.map((block) => block.start));
			return bLatest - aLatest; // Sort in descending order (most recent first)
		});
	}, [activities]);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 overflow-auto">
			<div className="bg-white p-6 rounded-lg w-3/4 max-h-3/4 overflow-auto max-h-[80%]">
				<h2 className="text-2xl font-bold mb-4">Edit Habit Times</h2>
				<table className="w-full border-collapse border border-gray-300">
					<thead>
						<tr className="bg-gray-100">
							<th className="border border-gray-300 p-2">Habit Name</th>
							<th className="border border-gray-300 p-2">Start Time</th>
							<th className="border border-gray-300 p-2">End Time</th>
						</tr>
					</thead>
					<tbody>
						{sortedActivities.flatMap((activity) =>
							activity.timeBlocks
								.sort((a, b) => b.start - a.start) // Sort time blocks within each activity
								.map((timeBlock, index) => (
									<tr key={`${activity.id}-${index}`}>
										<td className="border border-gray-300 p-2">{activity.name}</td>
										<td className="border border-gray-300 p-2">
											<input
												type="datetime-local"
												value={moment(timeBlock.start).format('YYYY-MM-DDTHH:mm')}
												onChange={(e) => onUpdateTimeBlock(activity.id, index, 'start', e.target.value)}
												className="w-full p-1 border rounded"
											/>
										</td>
										<td className="border border-gray-300 p-2">
											<input
												type="datetime-local"
												value={moment(timeBlock.end).format('YYYY-MM-DDTHH:mm')}
												onChange={(e) => onUpdateTimeBlock(activity.id, index, 'end', e.target.value)}
												className="w-full p-1 border rounded"
											/>
										</td>
									</tr>
								)),
						)}
					</tbody>
				</table>
				<div className="mt-4 flex justify-end">
					<button onClick={onClose} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export default function Home() {
	const [activities, setActivities] = useState<Activity[]>([]);
	const [newActivityName, setNewActivityName] = useState('');
	const [editingActivity, setEditingActivity] = useState<string | null>(null);
	const [timerState, setTimerState] = useState<{ [activityId: string]: number | null }>({});
	const [showDeletedHabits, setShowDeletedHabits] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [currentDate, setCurrentDate] = useState<string>(getLocalDateString(new Date()));
	const [, setTick] = useState(0);
	const [showEditModal, setShowEditModal] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	function getLocalDateString(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function normalizeTimeSpentDates(timeSpent: { [date: string]: number }): { [date: string]: number } {
		const normalized: { [date: string]: number } = {};
		for (const [date, duration] of Object.entries(timeSpent)) {
			const [year, month, day] = date.split('-').map(Number);
			const normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			normalized[normalizedDate] = duration;
		}
		return normalized;
	}

	const filteredActivities = useMemo(() => {
		return activities.filter(
			(activity) => activity.name.toLowerCase().includes(searchTerm.toLowerCase()) && (!activity.isDeleted || showDeletedHabits),
		);
	}, [activities, searchTerm, showDeletedHabits]);

	useEffect(() => {
		const loadActivities = () => {
			const savedActivities = localStorage.getItem('habitTrackerActivities');
			if (savedActivities) {
				try {
					const parsedActivities = JSON.parse(savedActivities);
					if (Array.isArray(parsedActivities)) {
						const normalizedActivities = parsedActivities.map((activity) => {
							return { ...activity, timeBlocks: Array.isArray(activity.timeBlocks) ? activity.timeBlocks : [] };
						});
						setActivities(normalizedActivities);
					} else {
						console.error('Saved activities is not an array:', parsedActivities);
						setActivities([]);
					}
				} catch (error) {
					console.error('Error parsing saved activities:', error);
					setActivities([]);
				}
			}
		};

		loadActivities();
	}, []);

	useEffect(() => {
		if (activities.length > 0) {
			localStorage.setItem('habitTrackerActivities', JSON.stringify(activities));
		}
	}, [activities]);

	useEffect(() => {
		const timer = setInterval(() => {
			const now = new Date();
			const newDate = getLocalDateString(now);
			if (newDate !== currentDate) {
				setCurrentDate(newDate);
			}
			setTick((tick) => tick + 1); // Force a re-render every second
		}, 1000);

		return () => clearInterval(timer);
	}, [currentDate]);

	function addActivity() {
		if (newActivityName.trim() !== '') {
			const newActivity: Activity = {
				id: Date.now().toString(),
				name: newActivityName,
				timeBlocks: [],
				isDeleted: false,
				color: COLORS[activities.length % COLORS.length],
			};
			setActivities((prevActivities) => [...prevActivities, newActivity]);
			setNewActivityName('');
		}
	}

	function handleAddActivityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			addActivity();
		}
	}

	function updateActivityName(id: string, newName: string) {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, name: newName } : activity)));
		setEditingActivity(null);
	}

	function handleUpdateActivityKeyDown(event: KeyboardEvent<HTMLInputElement>, id: string) {
		if (event.key === 'Enter') {
			updateActivityName(id, event.currentTarget.value);
		}
	}

	function deleteActivity(id: string) {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, isDeleted: true } : activity)));
	}

	function updateActivityColor(id: string, newColor: string) {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, color: newColor } : activity)));
	}

	function startTimer(activityId: string) {
		const now = Date.now();

		setActivities((prevActivities) =>
			prevActivities.map((activity) => {
				if (activity.id === activityId) {
					// Check if there's an existing time block that ended recently
					const existingTimeBlocks = Array.isArray(activity.timeBlocks) ? activity.timeBlocks : [];
					const lastBlock = existingTimeBlocks[existingTimeBlocks.length - 1];

					if (lastBlock && now - lastBlock.end <= MERGE_THRESHOLD) {
						// If the new start time is within the merge threshold of the last block's end time,
						// extend the last block instead of creating a new one
						const updatedLastBlock = { ...lastBlock, end: now };
						const updatedTimeBlocks = [...existingTimeBlocks.slice(0, -1), updatedLastBlock];
						return { ...activity, timeBlocks: updatedTimeBlocks };
					} else {
						// Otherwise, create a new time block
						const newTimeBlock: TimeBlock = { start: now, end: now };
						const updatedTimeBlocks = mergeTimeBlocks([...existingTimeBlocks, newTimeBlock]);
						return { ...activity, timeBlocks: updatedTimeBlocks };
					}
				}
				return activity;
			}),
		);

		setTimerState((prevState) => ({
			...prevState,
			[activityId]: now,
		}));
	}

	function stopTimer(activityId: string) {
		const startTime = timerState[activityId];
		if (startTime) {
			const endTime = Date.now();

			setActivities((prevActivities) =>
				prevActivities.map((activity) => {
					if (activity.id === activityId) {
						const newTimeBlock: TimeBlock = { start: startTime, end: endTime };
						const existingTimeBlocks = Array.isArray(activity.timeBlocks) ? activity.timeBlocks : [];
						const updatedTimeBlocks = mergeTimeBlocks([...existingTimeBlocks, newTimeBlock]);
						return { ...activity, timeBlocks: updatedTimeBlocks };
					}
					return activity;
				}),
			);

			setTimerState((prevState) => {
				const newState = { ...prevState };
				delete newState[activityId];
				return newState;
			});
		}
	}

	function mergeTimeBlocks(timeBlocks: TimeBlock[]): TimeBlock[] {
		if (timeBlocks.length <= 1) return timeBlocks;

		const sortedBlocks = timeBlocks.sort((a, b) => a.start - b.start);
		const mergedBlocks: TimeBlock[] = [sortedBlocks[0]];

		for (let i = 1; i < sortedBlocks.length; i++) {
			const currentBlock = sortedBlocks[i];
			const lastMergedBlock = mergedBlocks[mergedBlocks.length - 1];

			if (currentBlock.start - lastMergedBlock.end <= MERGE_THRESHOLD) {
				lastMergedBlock.end = Math.max(lastMergedBlock.end, currentBlock.end);
			} else {
				mergedBlocks.push(currentBlock);
			}
		}

		return mergedBlocks;
	}

	function formatTime(seconds: number) {
		if (seconds < 0) seconds = 0;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function getActivityTime(activity: Activity): number {
		const now = Date.now();
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);
		const midnight = today.getTime();
		let totalTime = 0;

		if (Array.isArray(activity.timeBlocks)) {
			totalTime = activity.timeBlocks.reduce((sum, block) => {
				const blockStart = Math.max(block.start, midnight);
				const blockEnd = Math.min(block.end, now);
				return sum + Math.max(0, blockEnd - blockStart);
			}, 0);
		}

		if (timerState[activity.id]) {
			const timerStart = Math.max(timerState[activity.id]!, midnight);
			totalTime += now - timerStart;
		}

		return Math.floor(totalTime / 1000);
	}

	function getAllActivitiesWeeklyData() {
		const today = new Date();
		const last7Days = Array.from({ length: 7 }, (_, i) => {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			return date;
		}).reverse();

		return last7Days.map((date) => {
			const dateString = getLocalDateString(date);
			const dayStart = new Date(date).setHours(0, 0, 0, 0);
			const dayEnd = new Date(date).setHours(23, 59, 59, 999);

			const dayData: { [key: string]: string | number } = { date: dateString };
			activities
				.filter((activity) => !activity.isDeleted || showDeletedHabits)
				.forEach((activity) => {
					const timeSpentInMinutes = Array.isArray(activity.timeBlocks)
						? activity.timeBlocks.reduce((total, block) => {
								const blockStart = Math.max(block.start, dayStart);
								const blockEnd = Math.min(block.end, dayEnd);
								return total + Math.max(0, (blockEnd - blockStart) / 60000); // Convert ms to minutes
							}, 0)
						: 0;
					dayData[activity.name] = Math.round(timeSpentInMinutes);
				});
			return dayData;
		});
	}

	function getTotalTimeSpent() {
		return activities
			.filter((activity) => !activity.isDeleted || showDeletedHabits)
			.map((activity) => ({
				name: activity.name,
				value: Array.isArray(activity.timeBlocks)
					? activity.timeBlocks.reduce((sum, block) => sum + (block.end - block.start), 0) / 60000 // Convert to minutes
					: 0,
			}));
	}

	function exportData() {
		const dataStr = JSON.stringify(activities);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
		const exportFileDefaultName = 'habit_tracker_data.json';

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	}

	function importData(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const importedData = JSON.parse(e.target?.result as string);
					if (Array.isArray(importedData)) {
						const validatedData = importedData
							.map((item) => {
								if (typeof item !== 'object' || item === null) {
									console.warn('Invalid item:', item);
									return null;
								}

								// Ensure all required fields are present
								const validatedItem: Activity = {
									id: item.id || Date.now().toString(),
									name: item.name || 'Unnamed Activity',
									timeBlocks: [],
									isDeleted: item.isDeleted ?? false,
									color: item.color || COLORS[Math.floor(Math.random() * COLORS.length)],
								};

								// Convert old timeSpent format to timeBlocks if necessary
								if (item.timeSpent && typeof item.timeSpent === 'object') {
									Object.entries(item.timeSpent).forEach(([date, duration]) => {
										const start = new Date(date).getTime();
										validatedItem.timeBlocks.push({
											start: start,
											end: start + (duration as number) * 1000,
										});
									});
								} else if (Array.isArray(item.timeBlocks)) {
									validatedItem.timeBlocks = item.timeBlocks.filter(
										(block: TimeBlock) => typeof block.start === 'number' && typeof block.end === 'number',
									);
								}

								return validatedItem;
							})
							.filter((item) => item !== null) as Activity[];

						if (validatedData.length === 0) {
							alert('No valid data found in the imported file.');
						} else if (validatedData.length < importedData.length) {
							alert(`Imported ${validatedData.length} out of ${importedData.length} items. Some items were invalid and skipped.`);
							setActivities(validatedData);
						} else {
							setActivities(validatedData);
							alert('Data imported successfully!');
						}
					} else {
						alert('Invalid data format. The file should contain an array of activities.');
					}
				} catch (error) {
					console.error('Error parsing imported data:', error);
					alert('Error importing data. Please make sure the file contains valid JSON data.');
				}
			};
			reader.readAsText(file);
		}
	}

	function handleUpdateTimeBlock(activityId: string, oldTimeBlock: TimeBlock, newTimeBlock: TimeBlock) {
		setActivities((prevActivities) =>
			prevActivities.map((activity) => {
				if (activity.id === activityId) {
					const updatedTimeBlocks = activity.timeBlocks.map((block) => (block === oldTimeBlock ? newTimeBlock : block));
					return { ...activity, timeBlocks: updatedTimeBlocks };
				}
				return activity;
			}),
		);
	}

	function handleTimeBlockChange(activityId: string, timeBlockIndex: number, field: 'start' | 'end', value: string) {
		setActivities((prevActivities) =>
			prevActivities.map((activity) => {
				if (activity.id === activityId) {
					const updatedTimeBlocks = [...activity.timeBlocks];
					updatedTimeBlocks[timeBlockIndex] = {
						...updatedTimeBlocks[timeBlockIndex],
						[field]: moment(value).valueOf(),
					};
					return { ...activity, timeBlocks: updatedTimeBlocks };
				}
				return activity;
			}),
		);
	}

	return (
		<div className="flex h-screen bg-white text-gray-800">
			{/* Sidebar */}
			<div className="w-64 bg-gray-100 p-4">
				<div className="flex items-center mb-6">
					<div className="w-8 h-8 bg-blue-600 rounded-lg mr-2"></div>
					<span className="font-semibold">Habit Tracker</span>
					<ChevronDown className="ml-auto" size={16} />
				</div>
				<div className="space-y-4 flex flex-col">
					<div className="flex items-center">
						<Search size={16} className="mr-2" />
						<input
							type="text"
							placeholder="Search habits"
							className="bg-transparent outline-none w-full"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<Link className="font-semibold" href="#Activities">
						Activities
					</Link>
					<div className="pl-4 space-y-2 text-sm">
						{filteredActivities.map((activity) => (
							<div key={activity.id} className="flex items-center justify-between">
								<span>{activity.name}</span>
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: activity.color }}></div>
							</div>
						))}
					</div>
					<Link className="font-semibold" href="#Calendar">
						Calendar
					</Link>
					<Link className="font-semibold" href="#Charts">
						Charts
					</Link>
				</div>
			</div>

			{/* Main content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center space-x-4">
						<span className="font-semibold">Habit Tracker Dashboard</span>
					</div>
					<div className="flex items-center space-x-4">
						<button onClick={exportData} className="text-green-500 hover:text-green-600" title="Export Data">
							<Download size={16} />
						</button>
						<input type="file" ref={fileInputRef} onChange={importData} style={{ display: 'none' }} accept=".json" />
						<button onClick={() => fileInputRef.current?.click()} className="text-yellow-500 hover:text-yellow-600" title="Import Data">
							<Upload size={16} />
						</button>
						<button onClick={() => setShowEditModal(true)} className="text-blue-500 hover:text-blue-600" title="Edit Habits">
							<Edit2 size={16} />
						</button>
						{/* <Bell size={16} />
						<MessageSquare size={16} /> */}
						<div className="w-6 h-6 bg-gray-300 rounded-full"></div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 p-4 overflow-auto">
					<div className="mb-6 flex justify-between items-center" id="Activities">
						<div className="flex items-center">
							<input
								type="text"
								value={newActivityName}
								onChange={(e) => setNewActivityName(e.target.value)}
								onKeyDown={handleAddActivityKeyDown}
								placeholder="Enter new activity name"
								className="p-2 border rounded mr-2"
							/>
							<button onClick={addActivity} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
								<PlusCircle className="inline-block mr-1" size={16} /> Add Activity
							</button>
						</div>
						<button
							onClick={() => setShowDeletedHabits(!showDeletedHabits)}
							className={`${showDeletedHabits ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white p-2 rounded`}>
							{showDeletedHabits ? <EyeOff className="inline-block mr-1" size={16} /> : <Eye className="inline-block mr-1" size={16} />}
							{showDeletedHabits ? 'Hide Deleted Habits' : 'Show Deleted Habits'}
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
						{filteredActivities.map((activity) => (
							<div key={activity.id} className="border rounded p-4" style={{ borderColor: activity.color }}>
								{editingActivity === activity.id ? (
									<input
										type="text"
										defaultValue={activity.name}
										onKeyDown={(e) => handleUpdateActivityKeyDown(e, activity.id)}
										onBlur={(e) => updateActivityName(activity.id, e.target.value)}
										className="p-1 border rounded w-full mb-2"
										autoFocus
									/>
								) : (
									<h2 className="text-xl font-semibold mb-2 flex justify-between items-center">
										{activity.name}
										<div>
											<button
												onClick={() => setEditingActivity(activity.id)}
												className="text-gray-500 hover:text-gray-700 mr-2">
												<Edit2 size={16} />
											</button>
											<button onClick={() => deleteActivity(activity.id)} className="text-red-500 hover:text-red-700 mr-2">
												<Trash2 size={16} />
											</button>
											<input
												type="color"
												value={activity.color}
												onChange={(e) => updateActivityColor(activity.id, e.target.value)}
												className="w-6 h-6 rounded-full cursor-pointer"
												title="Change color"
											/>
										</div>
									</h2>
								)}

								{timerState[activity.id] ? (
									<button
										onClick={() => stopTimer(activity.id)}
										className="bg-red-500 text-white p-2 rounded hover:bg-red-600 w-full mb-2">
										<StopCircle className="inline-block mr-1" size={16} /> Stop Timer
									</button>
								) : (
									<button
										onClick={() => startTimer(activity.id)}
										className="bg-green-500 text-white p-2 rounded hover:bg-green-600 w-full mb-2">
										<PlayCircle className="inline-block mr-1" size={16} /> Start Timer
									</button>
								)}

								<p className="mb-2">{formatTime(getActivityTime(activity))}</p>
							</div>
						))}
					</div>

					{/* Charts and Calendar sections */}
					<div className="space-y-8">
						<div id="Calendar">
							<h2 className="text-xl font-semibold mb-4">Activity Calendar</h2>
							<ActivityCalendar
								activities={activities.filter((activity) => !activity.isDeleted || showDeletedHabits)}
								onUpdateTimeBlock={handleUpdateTimeBlock}
							/>
						</div>
						<div id="Charts">
							<h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={getAllActivitiesWeeklyData()}>
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Legend />
										{activities
											.filter((activity) => !activity.isDeleted || showDeletedHabits)
											.map((activity) => (
												<Bar key={activity.id} dataKey={activity.name} stackId="a" fill={activity.color} />
											))}
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div>
							<h2 className="text-xl font-semibold mb-4">Activity Trends</h2>
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={getAllActivitiesWeeklyData()}>
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Legend />
										{activities
											.filter((activity) => !activity.isDeleted || showDeletedHabits)
											.map((activity) => (
												<Line key={activity.id} type="monotone" dataKey={activity.name} stroke={activity.color} />
											))}
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div>
							<h2 className="text-xl font-semibold mb-4">Activity Distribution</h2>
							<div className="h-80">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={getTotalTimeSpent()}
											cx="50%"
											cy="50%"
											labelLine={false}
											outerRadius={80}
											fill="#8884d8"
											dataKey="value"
											label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
											{getTotalTimeSpent().map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={activities.find((a) => a.name === entry.name)?.color || COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				</div>
			</div>

			{showEditModal && (
				<EditHabitsModal
					activities={activities.filter((activity) => !activity.isDeleted || showDeletedHabits)}
					onClose={() => setShowEditModal(false)}
					onUpdateTimeBlock={handleTimeBlockChange}
				/>
			)}
		</div>
	);
}
