import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, X, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TaskAlert() {
  const { currentUser } = useAuth();
  const [dueTasks, setDueTasks] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedTaskIds, setDismissedTaskIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const employeeName = currentUser?.profile?.name;
    const employeeEmail = currentUser?.email;
    if (!employeeName && !employeeEmail) return;

    const q = query(collection(db, 'tasks'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter tasks assigned to current user
      const userTasks = fetchedTasks.filter(t => 
        (t.assignedTo === employeeName || t.assignedToEmail === employeeEmail) &&
        t.status !== 'Completed'
      );

      // Check for due tasks
      const checkTasks = () => {
        const now = new Date();
        const due = [];

        userTasks.forEach(task => {
          if (!task.dueDate) return;
          if (dismissedTaskIds.has(task.id)) return;

          const dueDate = new Date(task.dueDate);
          if (isNaN(dueDate.getTime())) return;

          // If the task is due (dueDate is in the past or exactly now)
          // and we haven't dismissed it
          if (dueDate <= now) {
            due.push(task);
          }
        });

        if (due.length > 0) {
          setDueTasks(due);
          setIsOpen(true);
        }
      };

      // Check immediately
      checkTasks();

      // Check every minute
      const intervalId = setInterval(checkTasks, 60000);
      return () => clearInterval(intervalId);
    });

    return () => unsubscribe();
  }, [currentUser, dismissedTaskIds]);

  const handleDismiss = () => {
    setIsOpen(false);
    const newDismissed = new Set(dismissedTaskIds);
    dueTasks.forEach(t => newDismissed.add(t.id));
    setDismissedTaskIds(newDismissed);
  };

  const handleMarkCompleted = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: 'Completed' });
      toast.success('Task marked as completed!');
      
      const remainingTasks = dueTasks.filter(t => t.id !== taskId);
      if (remainingTasks.length > 0) {
        setDueTasks(remainingTasks);
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error completing task:', err);
      toast.error('Failed to complete task');
    }
  };

  if (!isOpen || dueTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-[#1b2f63] px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold tracking-wide">Task Reminder</h2>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50/50">
          <p className="text-gray-600 mb-4 text-sm font-medium">
            You have {dueTasks.length} {dueTasks.length === 1 ? 'task' : 'tasks'} due right now.
          </p>

          <div className="space-y-4">
            {dueTasks.map(task => (
              <div key={task.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                        OVERDUE / DUE
                      </span>
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        {task.priority} Priority
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 font-medium">
                      <Clock className="w-4 h-4" />
                      {new Date(task.dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleMarkCompleted(task.id)}
                      className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Done
                    </button>
                    <button 
                      onClick={() => {
                        handleDismiss();
                        navigate('/tasks');
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      View
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
}
