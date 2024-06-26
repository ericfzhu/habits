'use client';

import { Download, Edit2, Eye, EyeOff, PlayCircle, PlusCircle, StopCircle, Trash2, Upload } from 'lucide-react';
import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Line, LineChart } from 'recharts';

import ActivityCalendar from './calendar';

interface Activity {
	id: string;
	name: string;
	timeSpent: { [date: string]: number };
	isDeleted: boolean;
	color: string;
}

interface TimerState {
	[activityId: string]: number | null;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Home() {
	const [activities, setActivities] = useState<Activity[]>([]);
	const [newActivityName, setNewActivityName] = useState('');
	const [editingActivity, setEditingActivity] = useState<string | null>(null);
	const [timerState, setTimerState] = useState<TimerState>({ activityId: null, startTime: null });
	const [showDeletedHabits, setShowDeletedHabits] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [currentTime, setCurrentTime] = useState<number>(Date.now());
	const [currentDate, setCurrentDate] = useState<string>(getLocalDateString());

	function getLocalDateString(): string {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		})
			.format(new Date())
			.split('/')
			.reverse()
			.join('-');
	}

	useEffect(() => {
		const loadActivities = () => {
			const savedActivities = localStorage.getItem('habitTrackerActivities');
			if (savedActivities) {
				try {
					const parsedActivities = JSON.parse(savedActivities);
					if (Array.isArray(parsedActivities)) {
						setActivities(parsedActivities);
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
			setCurrentTime(now.getTime());
			const newDate = getLocalDateString();
			if (newDate !== currentDate) {
				setCurrentDate(newDate);
				handleDayTransition();
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [currentDate, activities, timerState]);

	function handleDayTransition() {
		// Stop all running timers and save their progress
		Object.entries(timerState).forEach(([activityId, startTime]) => {
			stopTimer(activityId);
		});

		// Clear the timer state for the new day
		setTimerState({});
	}

	function addActivity() {
		if (newActivityName.trim() !== '') {
			const newActivity: Activity = {
				id: Date.now().toString(),
				name: newActivityName,
				timeSpent: {},
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
		setTimerState((prevState) => ({
			...prevState,
			[activityId]: Date.now(),
		}));
	}

	function stopTimer(activityId: string) {
		const startTime = timerState[activityId];
		if (startTime) {
			const duration = Math.max(0, Math.round((Date.now() - startTime) / 1000));
			const today = getLocalDateString();

			setActivities((prevActivities) =>
				prevActivities.map((activity) =>
					activity.id === activityId
						? {
								...activity,
								timeSpent: {
									...activity.timeSpent,
									[today]: (activity.timeSpent[today] || 0) + duration,
								},
							}
						: activity,
				),
			);

			setTimerState((prevState) => {
				const newState = { ...prevState };
				delete newState[activityId];
				return newState;
			});
		}
	}

	function formatTime(seconds: number) {
		if (seconds < 0) seconds = 0;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function getActivityTime(activity: Activity): number {
		const today = getLocalDateString();
		const baseTime = activity.timeSpent[today] || 0;

		if (timerState[activity.id]) {
			const additionalTime = Math.max(0, Math.floor((currentTime - timerState[activity.id]!) / 1000));
			return baseTime + additionalTime;
		}

		return baseTime;
	}
	function getAllActivitiesWeeklyData() {
		const today = new Date();
		const last7Days = Array.from({ length: 7 }, (_, i) => {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			return date.toISOString().split('T')[0];
		}).reverse();

		return last7Days.map((date) => {
			const dayData: { [key: string]: string | number } = { date };
			activities
				.filter((activity) => !activity.isDeleted || showDeletedHabits)
				.forEach((activity) => {
					dayData[activity.name] = Math.round((activity.timeSpent[date] || 0) / 60);
				});
			return dayData;
		});
	}

	function getTotalTimeSpent() {
		return activities
			.filter((activity) => !activity.isDeleted || showDeletedHabits)
			.map((activity) => ({
				name: activity.name,
				value: Object.values(activity.timeSpent).reduce((sum, time) => sum + time, 0) / 60,
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
								const validatedItem = {
									id: item.id || Date.now().toString(),
									name: item.name || 'Unnamed Activity',
									timeSpent: typeof item.timeSpent === 'object' ? item.timeSpent : {},
									isDeleted: item.isDeleted ?? false, // Use nullish coalescing to set default
									color: item.color || COLORS[Math.floor(Math.random() * COLORS.length)],
								};

								// Check if all required fields are present and valid
								if (!validatedItem.id || typeof validatedItem.name !== 'string' || typeof validatedItem.timeSpent !== 'object') {
									console.warn('Item missing required fields or has invalid data:', item);
									return null;
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

	return (
		<div className="container mx-auto p-4">
			{/* <h1 className="text-3xl font-bold mb-6">Habit Tracker</h1> */}
			{/* <div>current time: {currentTime}</div> */}

			<div className="mb-6 flex justify-between items-center">
				<div>
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
				<div>
					<button onClick={exportData} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mr-2">
						<Download className="inline-block mr-1" size={16} /> Export Data
					</button>
					<input type="file" ref={fileInputRef} onChange={importData} style={{ display: 'none' }} accept=".json" />
					<button onClick={() => fileInputRef.current?.click()} className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">
						<Upload className="inline-block mr-1" size={16} /> Import Data
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{activities
					.filter((activity) => !activity.isDeleted)
					.map((activity) => (
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
										<button onClick={() => setEditingActivity(activity.id)} className="text-gray-500 hover:text-gray-700 mr-2">
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

							<p className="mb-2">Today: {formatTime(getActivityTime(activity))}</p>
							{/* 
							<button
								onClick={() => {
									setSelectedActivity(activity.id);
									setShowAllStats(false);
								}}
								className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 w-full">
								<ChartIcon className="inline-block mr-1" size={16} /> View Stats
							</button> */}
						</div>
					))}
			</div>

			<div className="flex justify-end items-end mb-8">
				{/* <button
					onClick={() => {
						setShowAllStats(true);
						setSelectedActivity(null);
					}}
					className="bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600">
					<PieChartIcon className="inline-block mr-1" size={16} /> View All Activities Summary
				</button> */}
				<button
					onClick={() => setShowDeletedHabits(!showDeletedHabits)}
					className={`${showDeletedHabits ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white p-2 rounded`}>
					{showDeletedHabits ? <EyeOff className="inline-block mr-1" size={16} /> : <Eye className="inline-block mr-1" size={16} />}
					{showDeletedHabits ? 'Hide Deleted Habits' : 'Show Deleted Habits'}
				</button>
			</div>

			{/* {selectedActivity && (
				<div className="mt-8">
					<h2 className="text-2xl font-bold mb-4">Stats for {activities.find((a) => a.id === selectedActivity)?.name}</h2>
					<div className="h-80 mb-8">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={getWeeklyData(activities.find((a) => a.id === selectedActivity)!)}>
								<XAxis dataKey="date" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Bar dataKey="minutes" fill="#8884d8" name="Minutes" />
							</BarChart>
						</ResponsiveContainer>
					</div>
					<div className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={getWeeklyData(activities.find((a) => a.id === selectedActivity)!)}>
								<XAxis dataKey="date" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Line type="monotone" dataKey="minutes" stroke="#82ca9d" name="Minutes" />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)} */}

			{/* Calendar View */}
			{/* {showCalendarView && ( */}
			<div className="mt-8">
				<h2 className="text-2xl font-bold mb-4">Activity Calendar</h2>
				<ActivityCalendar activities={activities.filter((activity) => !activity.isDeleted || showDeletedHabits)} />
			</div>
			{/* )} */}

			{/* {showAllStats && ( */}
			<div className="mt-8">
				<h2 className="text-2xl font-bold mb-4">All Activities Summary</h2>
				<div className="h-80 mb-8">
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
				<div className="h-80 mb-8">
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
			{/* )} */}
		</div>
	);
}
