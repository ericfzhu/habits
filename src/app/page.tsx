'use client';

import {
	Calendar,
	BarChart as ChartIcon,
	Download,
	Edit2,
	Eye,
	EyeOff,
	PieChart as PieChartIcon,
	PlayCircle,
	PlusCircle,
	StopCircle,
	Trash2,
	Upload,
} from 'lucide-react';
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
	activityId: string | null;
	startTime: number | null;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Home() {
	const [activities, setActivities] = useState<Activity[]>([]);
	const [newActivityName, setNewActivityName] = useState('');
	const [editingActivity, setEditingActivity] = useState<string | null>(null);
	const [timerState, setTimerState] = useState<TimerState>({ activityId: null, startTime: null });
	const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
	const [showAllStats, setShowAllStats] = useState(false);
	const [showDeletedHabits, setShowDeletedHabits] = useState(false);
	const [showCalendarView, setShowCalendarView] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [currentTime, setCurrentTime] = useState<number>(Date.now());

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
			setCurrentTime(Date.now());
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const addActivity = () => {
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
	};

	const handleAddActivityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			addActivity();
		}
	};

	const updateActivityName = (id: string, newName: string) => {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, name: newName } : activity)));
		setEditingActivity(null);
	};

	const handleUpdateActivityKeyDown = (event: KeyboardEvent<HTMLInputElement>, id: string) => {
		if (event.key === 'Enter') {
			updateActivityName(id, event.currentTarget.value);
		}
	};

	const deleteActivity = (id: string) => {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, isDeleted: true } : activity)));
	};

	const updateActivityColor = (id: string, newColor: string) => {
		setActivities((prevActivities) => prevActivities.map((activity) => (activity.id === id ? { ...activity, color: newColor } : activity)));
	};

	const startTimer = (activityId: string) => {
		setTimerState({ activityId, startTime: Date.now() });
	};

	const stopTimer = () => {
		if (timerState.activityId && timerState.startTime) {
			const duration = Math.round((Date.now() - timerState.startTime) / 1000);
			const today = new Date().toISOString().split('T')[0];

			setActivities((prevActivities) =>
				prevActivities.map((activity) =>
					activity.id === timerState.activityId
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

			setTimerState({ activityId: null, startTime: null });
		}
	};

	const formatTime = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	};

	const getActivityTime = (activity: Activity) => {
		const today = new Date().toISOString().split('T')[0];
		const baseTime = activity.timeSpent[today] || 0;

		if (timerState.activityId === activity.id && timerState.startTime) {
			const additionalTime = Math.floor((currentTime - timerState.startTime) / 1000);
			return baseTime + additionalTime;
		}

		return baseTime;
	};

	const getWeeklyData = (activity: Activity) => {
		const today = new Date();
		const last7Days = Array.from({ length: 7 }, (_, i) => {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			return date.toISOString().split('T')[0];
		}).reverse();

		return last7Days.map((date) => ({
			date,
			minutes: Math.round((activity.timeSpent[date] || 0) / 60),
		}));
	};

	const getAllActivitiesWeeklyData = () => {
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
	};

	const getTotalTimeSpent = () => {
		return activities
			.filter((activity) => !activity.isDeleted || showDeletedHabits)
			.map((activity) => ({
				name: activity.name,
				value: Object.values(activity.timeSpent).reduce((sum, time) => sum + time, 0) / 60,
			}));
	};

	const exportData = () => {
		const dataStr = JSON.stringify(activities);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
		const exportFileDefaultName = 'habit_tracker_data.json';

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	};

	const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const importedData = JSON.parse(e.target?.result as string);
					if (
						Array.isArray(importedData) &&
						importedData.every(
							(item) => typeof item === 'object' && 'id' in item && 'name' in item && 'timeSpent' in item && 'isDeleted' in item,
						)
					) {
						setActivities(importedData);
					} else {
						alert('Invalid data format. Please use a valid exported file.');
					}
				} catch (error) {
					console.error('Error parsing imported data:', error);
					alert('Error importing data. Please try again with a valid file.');
				}
			};
			reader.readAsText(file);
		}
	};

	return (
		<div className="container mx-auto p-4">
			{/* <h1 className="text-3xl font-bold mb-6">Habit Tracker</h1> */}

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

							{timerState.activityId === activity.id ? (
								<button onClick={stopTimer} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 w-full mb-2">
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
