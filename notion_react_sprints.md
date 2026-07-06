# ⚛️ YLabs React Curriculum & Evaluation Guide (Detailed)

This document serves as the master guide for the YLabs Advanced React Learning Track. It details exactly what students will build in each sprint, what specific concepts they will learn, and precisely how our proprietary grading engine evaluates their work.

---

## 🎯 Hybrid Grading Engine: The Inner Workings

To ensure students are not just building functional apps, but building them using best practices, our engine employs a dual-channel grading system for every ticket:

### 1. Visual Score (SSIM Algorithm)
The platform natively renders the student's React code in an isolated iframe. It then takes a headless screenshot of this iframe and compares it against our hidden **Target Design** (rendered via `ReactReferenceView`).
- **Algorithm**: We use the Structural Similarity Index (SSIM) algorithm via a Python OpenCV backend.
- **Goal**: This forces students to pay close attention to CSS layout, flexbox alignments, padding, margins, and typography. A mismatch in layout reduces the visual score.

### 2. Logic Score (Regex AST Pattern Matching)
Visuals aren't enough—students must use the correct React architecture. We use Regex pattern matching on their raw `.jsx` source files to detect the presence of required hooks and structures.
- **Example**: If a ticket asks for `useReducer`, the grading engine scans the code specifically for `/useReducer/`. If missing, the Logic Score drops drastically.
- **Example**: If a ticket requires mapping an array, it scans for `/\.map/`.
- **Combined Output**: The Final Grade is a composite of `(Visual Score + Logic Score) / 2`.

---

## 🏃‍♂️ Sprint 1: The To-Do List (React Fundamentals)

**Goal**: Build a fully functional, controlled To-Do List from scratch while learning Component structure and Hooks.

* **REACT-101 | Component Skeleton**
  * **Task**: Build a static `TaskItem` component that receives `task` object props.
  * **Learning**: JSX fundamentals, component extraction, and passing props.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `function TaskItem(props)`, `<input type="checkbox">`, and `task.text` in the JSX.
  * **Solution**:
    **`TaskItem.jsx`**
    ```jsx
    export default function TaskItem({ task }) {
      return (
        <div className="task-item">
          <input type="checkbox" checked={task.completed} readOnly />
          <span>{task.text}</span>
          <button>Delete</button>
        </div>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import TaskItem from "./TaskItem";
    import "./App.css";
    export default function App() {
      const sampleTask = { id: 1, text: "Learn React", completed: false };
      return (
        <div className="app-container">
          <h1>To-Do List</h1>
          <TaskItem task={sampleTask} />
        </div>
      );
    }
    ```

* **REACT-102 | Task List State**
  * **Task**: Introduce `useState` and controlled inputs to add new tasks.
  * **Learning**: State arrays, controlled forms (`value` + `onChange`), and mapping lists.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `useState`, `<form onSubmit>`, `<input onChange>`, and `array.map`.
  * **Solution**:
    **`TaskItem.jsx`**
    ```jsx
    export default function TaskItem({ task }) {
      return (
        <div className="task-item">
          <input type="checkbox" checked={task.completed} readOnly />
          <span>{task.text}</span>
          <button>Delete</button>
        </div>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import TaskItem from "./TaskItem";
    import "./App.css";

    export default function App() {
      const [tasks, setTasks] = useState([]);
      const [text, setText] = useState("");

      const addTask = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setTasks([...tasks, { id: Date.now(), text, completed: false }]);
        setText("");
      };

      return (
        <div className="app-container">
          <h1>To-Do List</h1>
          <form onSubmit={addTask}>
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Add a new task..."
            />
            <button type="submit">Add</button>
          </form>
          <div className="task-list">
            {tasks.map(task => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      );
    }
    ```

* **REACT-103 | Task Actions (Prop Drilling)**
  * **Task**: Pass callback functions down to the `TaskItem` to toggle completion or delete tasks.
  * **Learning**: Event bubbling, Array `filter()`, and Prop Drilling limitations.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `onToggle`, `onDelete`, array `.map`, and array `.filter`.
  * **Solution**:
    **`TaskItem.jsx`**
    ```jsx
    export default function TaskItem({ task, onToggle, onDelete }) {
      return (
        <div className="task-item">
          <input 
            type="checkbox" 
            checked={task.completed} 
            onChange={() => onToggle(task.id)} 
          />
          <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
            {task.text}
          </span>
          <button onClick={() => onDelete(task.id)}>Delete</button>
        </div>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import TaskItem from "./TaskItem";
    import "./App.css";

    export default function App() {
      const [tasks, setTasks] = useState([]);
      const [text, setText] = useState("");

      const addTask = (e) => {
        e.preventDefault();
        setTasks([...tasks, { id: Date.now(), text, completed: false }]);
        setText("");
      };

      const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      };

      const deleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
      };

      return (
        <div className="app-container">
          <h1>To-Do List</h1>
          <form onSubmit={addTask}>
            <input value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit">Add</button>
          </form>
          <div className="task-list">
            {tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={toggleTask} 
                onDelete={deleteTask} 
              />
            ))}
          </div>
        </div>
      );
    }
    ```

* **REACT-104 | Data Persistence**
  * **Task**: Save the list to `localStorage` so it survives refresh.
  * **Learning**: The `useEffect` lifecycle hook and side effects.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Don't forget the dependency array!, Make sure to clean up any subscriptions if needed.
  * **Common Mistakes**: Forgetting the dependency array and causing an infinite loop.
  * **Evaluation**: Logic Grader specifically looks for `useEffect`, `localStorage.getItem`, and `localStorage.setItem`.
  * **Solution**:
    **`TaskItem.jsx`**
    ```jsx
    export default function TaskItem({ task, onToggle, onDelete }) {
      return (
        <div className="task-item">
          <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} />
          <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
          <button onClick={() => onDelete(task.id)}>Delete</button>
        </div>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useState, useEffect } from "react";
    import TaskItem from "./TaskItem";
    import "./App.css";

    export default function App() {
      const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem("tasks");
        return saved ? JSON.parse(saved) : [];
      });
      const [text, setText] = useState("");

      useEffect(() => {
        localStorage.setItem("tasks", JSON.stringify(tasks));
      }, [tasks]);

      const addTask = (e) => {
        e.preventDefault();
        setTasks([...tasks, { id: Date.now(), text, completed: false }]);
        setText("");
      };
      const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

      return (
        <div className="app-container">
          <h1>To-Do List</h1>
          <form onSubmit={addTask}>
            <input value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit">Add</button>
          </form>
          <div className="task-list">
            {tasks.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
          </div>
        </div>
      );
    }
    ```

* **REACT-105 | Dashboard Routing**
  * **Task**: Build conditional views (List View vs Dashboard View).
  * **Learning**: Conditional rendering and client-side routing concepts.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Visual Grader ensures the dashboard layout matches the target. Logic Grader checks for ternary operators (`=== ?`).
  * **Solution**:
    **`Dashboard.jsx`**
    ```jsx
    export default function Dashboard({ tasks }) {
      const completed = tasks.filter(t => t.completed).length;
      return (
        <div>
          <h2>Dashboard</h2>
          <p>Total Tasks: {tasks.length}</p>
          <p>Completed: {completed}</p>
        </div>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import Dashboard from "./Dashboard";
    import "./App.css";

    export default function App() {
      const [view, setView] = useState("list");
      const [tasks, setTasks] = useState([]);

      return (
        <div className="app-container">
          <nav>
            <button onClick={() => setView("list")}>To-Do List</button>
            <button onClick={() => setView("dashboard")}>Dashboard</button>
          </nav>
          <main>
            {view === "list" ? (
               <div>{tasks.length} tasks in list view (simulated)</div>
            ) : (
              <Dashboard tasks={tasks} />
            )}
          </main>
        </div>
      );
    }
    ```

* **REACT-106 | Theme Context**
  * **Task**: Build a global `ThemeContext` to avoid prop-drilling a dark mode boolean.
  * **Learning**: `createContext`, `useContext`, and global state providers.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `createContext`, `useContext`, and the `Provider` component.
  * **Solution**:
    **`ThemeContext.jsx`**
    ```jsx
    import { createContext, useState } from "react";

    export const ThemeContext = createContext();

    export function ThemeProvider({ children }) {
      const [theme, setTheme] = useState("light");
      const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");
      
      return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          {children}
        </ThemeContext.Provider>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useContext } from "react";
    import { ThemeProvider, ThemeContext } from "./ThemeContext";
    import "./App.css";

    function Layout() {
      const { theme, toggleTheme } = useContext(ThemeContext);
      return (
        <div className={`app-container ${theme}`}>
           <button onClick={toggleTheme}>Toggle Theme</button>
           <h1>Theme is {theme}</h1>
        </div>
      );
    }

    export default function App() {
      return (
        <ThemeProvider>
          <Layout />
        </ThemeProvider>
      );
    }
    ```

---

## 🏃‍♂️ Sprint 2: Kanban Board (Advanced State & Drag/Drop)

**Goal**: Graduate to complex, nested data structures and HTML5 Drag & Drop.

* **REACT-201 | Board Layout**
  * **Task**: Render a 3-column Kanban board by mapping over complex nested objects.
  * **Learning**: Deeply nested mapping and advanced CSS Flexbox layouts.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader requires `.map` loops and correct CSS class usage (`.column`, `.task`). Target Design expects a vibrant blue/yellow/green UI.
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import "./App.css";

    export default function App() {
      const [columns] = useState([
        { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },
        { id: "doing", title: "In Progress", tasks: [] },
        { id: "done", title: "Done", tasks: [] }
      ]);

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {columns.map(col => (
              <div key={col.id} className="column">
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <div key={task.id} className="task">
                    {task.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```

* **REACT-202 | HTML5 Drag & Drop**
  * **Task**: Make tasks draggable using the browser's native API.
  * **Learning**: `dataTransfer` objects, `onDragStart`, `onDragOver`, and preventing default browser drop behavior.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader scans for `draggable`, `onDragStart`, `onDragOver`, `preventDefault`, and `onDrop`.
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import "./App.css";

    export default function App() {
      const [columns, setColumns] = useState([
        { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },
        { id: "doing", title: "In Progress", tasks: [] },
        { id: "done", title: "Done", tasks: [] }
      ]);

      const handleDragStart = (e, taskId, sourceColId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", sourceColId);
      };

      const handleDragOver = (e) => {
        e.preventDefault();
      };

      const handleDrop = (e, targetColId) => {
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        
        if (sourceColId === targetColId) return;

        setColumns(prev => prev.map(col => {
          if (col.id === sourceColId) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
          }
          if (col.id === targetColId) {
            const task = prev.find(c => c.id === sourceColId).tasks.find(t => t.id === taskId);
            return { ...col, tasks: [...col.tasks, task] };
          }
          return col;
        }));
      };

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {columns.map(col => (
              <div 
                key={col.id} 
                className="column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="task"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```

* **REACT-203 | Context & Reducers**
  * **Task**: Refactor the messy drag-and-drop state into a global `useReducer`.
  * **Learning**: Flux architecture, state reducers, and dispatching actions.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader strictly checks for the presence of `useReducer` and `createContext` inside the global context file.
  * **Solution**:
    **`BoardContext.jsx`**
    ```jsx
    import { createContext, useReducer } from "react";

    const initialState = [
      { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },
      { id: "doing", title: "In Progress", tasks: [] },
      { id: "done", title: "Done", tasks: [] }
    ];

    function boardReducer(state, action) {
      switch (action.type) {
        case "MOVE_TASK":
          const { taskId, sourceColId, targetColId } = action.payload;
          if (sourceColId === targetColId) return state;
          
          return state.map(col => {
            if (col.id === sourceColId) {
              return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
            }
            if (col.id === targetColId) {
              const task = state.find(c => c.id === sourceColId).tasks.find(t => t.id === taskId);
              return { ...col, tasks: [...col.tasks, task] };
            }
            return col;
          });
        default:
          return state;
      }
    }

    export const BoardContext = createContext();

    export function BoardProvider({ children }) {
      const [state, dispatch] = useReducer(boardReducer, initialState);
      return (
        <BoardContext.Provider value={{ state, dispatch }}>
          {children}
        </BoardContext.Provider>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useContext } from "react";
    import { BoardContext, BoardProvider } from "./BoardContext";
    import "./App.css";

    function Board() {
      const { state: columns, dispatch } = useContext(BoardContext);

      const handleDragStart = (e, taskId, sourceColId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", sourceColId);
      };

      const handleDrop = (e, targetColId) => {
        dispatch({
          type: "MOVE_TASK",
          payload: {
            taskId: parseInt(e.dataTransfer.getData("taskId")),
            sourceColId: e.dataTransfer.getData("sourceColId"),
            targetColId
          }
        });
      };
      
      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {columns.map(col => (
              <div 
                key={col.id} 
                className="column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="task"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    export default function App() {
      return (
        <BoardProvider>
          <Board />
        </BoardProvider>
      );
    }
    ```

---

## 🏃‍♂️ Sprint 3: Real-Time Syncing (Concurrency)

**Goal**: Transform the offline Kanban board into a simulated real-time multiplayer experience.

> [!IMPORTANT]
> **Starter Code Notice**: The IDE starter code for Sprint 3 is intentionally left blank. You **must** copy your complete `App.jsx` and `BoardContext.jsx` from `REACT-203` before applying these solutions!

* **REACT-301 | Cross-Tab Storage Sync**
  * **Task**: Sync the board across multiple open tabs instantly.
  * **Learning**: Global window event listeners.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader expects `useEffect` and `addEventListener('storage')`.
  * **Solution**:
    **`BoardContext.jsx`**
    ```jsx
    import { createContext, useReducer, useEffect } from "react";

    const initialState = [
      { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },
      { id: "doing", title: "In Progress", tasks: [] },
      { id: "done", title: "Done", tasks: [] }
    ];

    function boardReducer(state, action) {
      if (action.type === "SYNC") return action.payload;
      if (action.type === "MOVE_TASK") {
        const { taskId, sourceColId, targetColId } = action.payload;
        if (sourceColId === targetColId) return state;
        
        return state.map(col => {
          if (col.id === sourceColId) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
          }
          if (col.id === targetColId) {
            const task = state.find(c => c.id === sourceColId).tasks.find(t => t.id === taskId);
            return { ...col, tasks: [...col.tasks, task] };
          }
          return col;
        });
      }
      return state;
    }

    export const BoardContext = createContext();

    export function BoardProvider({ children }) {
      const [state, dispatch] = useReducer(boardReducer, initialState);

      useEffect(() => {
        localStorage.setItem("kanban-state", JSON.stringify(state));
      }, [state]);

      useEffect(() => {
        const handleStorage = (e) => {
          if (e.key === "kanban-state" && e.newValue) {
            dispatch({ type: "SYNC", payload: JSON.parse(e.newValue) });
          }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      }, []);

      return (
        <BoardContext.Provider value={{ state, dispatch }}>
          {children}
        </BoardContext.Provider>
      );
    }
    ```
    **`App.jsx`**
    *(No changes from REACT-203 needed. Keep your App.jsx the exact same!)*

* **REACT-302 | Optimistic UI Updates**
  * **Task**: Simulate a slow backend API call but update the UI instantly (rolling back on failure).
  * **Learning**: Optimistic UX patterns and Promise simulation.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader requires `setTimeout` to simulate the network latency.
  * **Solution**:
    **`BoardContext.jsx`**
    *(No changes from REACT-301 needed. Keep your BoardContext.jsx the exact same!)*
    
    **`App.jsx`**
    ```jsx
    import { useContext } from "react";
    import { BoardContext, BoardProvider } from "./BoardContext";
    import "./App.css";

    function Board() {
      const { state: columns, dispatch } = useContext(BoardContext);

      const handleDragStart = (e, taskId, sourceColId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", sourceColId);
      };

      const handleDrop = (e, targetColId) => {
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        
        const previousState = [...columns]; // Save previous state

        // 1. Optimistic Update
        dispatch({ type: "MOVE_TASK", payload: { taskId, sourceColId, targetColId } });

        // 2. Simulated Network Request
        setTimeout(() => {
          const apiFails = Math.random() > 0.8;
          if (apiFails) {
            alert("API Error! Rolling back changes.");
            dispatch({ type: "SYNC", payload: previousState }); // Rollback
          }
        }, 1000);
      };

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {columns.map(col => (
              <div 
                key={col.id} 
                className="column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="task"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    export default function App() {
      return (
        <BoardProvider>
          <Board />
        </BoardProvider>
      );
    }
    ```

* **REACT-303 | Conflicting State Resolution**
  * **Task**: Add version locking to prevent two tabs from editing the same task simultaneously.
  * **Learning**: Distributed system concepts and operational locks on the frontend.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader looks for state locking mechanisms (e.g., `version` or `lock` variables).
  * **Solution**:
    **`BoardContext.jsx`**
    ```jsx
    import { createContext, useReducer, useEffect } from "react";

    const initialState = {
      version: 1,
      columns: [
        { id: "todo", title: "To Do", tasks: [{ id: 1, text: "Design Schema" }] },
        { id: "doing", title: "In Progress", tasks: [] },
        { id: "done", title: "Done", tasks: [] }
      ]
    };

    function boardReducer(state, action) {
      if (action.type === "SYNC") return action.payload;
      if (action.type === "MOVE_TASK") {
        const { taskId, sourceColId, targetColId, baseVersion } = action.payload;
        
        // Conflict Resolution
        if (baseVersion < state.version) {
           alert("Conflict! Someone else moved a task.");
           return state;
        }

        if (sourceColId === targetColId) return state;
        
        const newColumns = state.columns.map(col => {
          if (col.id === sourceColId) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
          }
          if (col.id === targetColId) {
            const task = state.columns.find(c => c.id === sourceColId).tasks.find(t => t.id === taskId);
            return { ...col, tasks: [...col.tasks, task] };
          }
          return col;
        });

        return { version: state.version + 1, columns: newColumns };
      }
      return state;
    }

    export const BoardContext = createContext();

    export function BoardProvider({ children }) {
      const [state, dispatch] = useReducer(boardReducer, initialState);
      
      useEffect(() => {
        localStorage.setItem("kanban-state", JSON.stringify(state));
      }, [state]);

      useEffect(() => {
        const handleStorage = (e) => {
          if (e.key === "kanban-state" && e.newValue) {
            dispatch({ type: "SYNC", payload: JSON.parse(e.newValue) });
          }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      }, []);

      return (
        <BoardContext.Provider value={{ state, dispatch }}>
          {children}
        </BoardContext.Provider>
      );
    }
    ```
    **`App.jsx`**
    ```jsx
    import { useContext } from "react";
    import { BoardContext, BoardProvider } from "./BoardContext";
    import "./App.css";

    function Board() {
      // NOTE: We now access state.columns because state is an object with a version!
      const { state, dispatch } = useContext(BoardContext);

      const handleDragStart = (e, taskId, sourceColId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", sourceColId);
      };

      const handleDrop = (e, targetColId) => {
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        
        const previousState = { ...state }; 

        // Send baseVersion in the payload!
        dispatch({ 
          type: "MOVE_TASK", 
          payload: { taskId, sourceColId, targetColId, baseVersion: state.version } 
        });

        setTimeout(() => {
          const apiFails = Math.random() > 0.8;
          if (apiFails) {
            alert("API Error! Rolling back changes.");
            dispatch({ type: "SYNC", payload: previousState }); 
          }
        }, 1000);
      };

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {state.columns.map(col => (
              <div 
                key={col.id} 
                className="column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="task"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    export default function App() {
      return (
        <BoardProvider>
          <Board />
        </BoardProvider>
      );
    }
    ```

---

## 🏃‍♂️ Sprint 4: Performance & Polish

**Goal**: Optimize the Kanban board so it doesn't freeze the browser at scale.

> [!IMPORTANT]
> **Starter Code Notice**: The IDE starter code for Sprint 4 is intentionally left blank. You **must** copy your complete `App.jsx` and `BoardContext.jsx` from Sprint 3 before applying these solutions!

* **REACT-401 | Memoization (React.memo)**
  * **Task**: Wrap components in React's cache so they don't re-render unless props change.
  * **Learning**: React's rendering lifecycle, `useMemo`, and `useCallback`.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `memo`, `useMemo`, or `useCallback` invocations.
  * **Solution**:
    **`Task.jsx`**
    ```jsx
    import React from 'react';

    const Task = React.memo(({ task, onDragStart, colId }) => {
      return (
        <div 
          className="task"
          draggable={true}
          onDragStart={(e) => onDragStart(e, task.id, colId)}
        >
          {task.text}
        </div>
      );
    });
    export default Task;
    ```
    **`BoardContext.jsx`**
    *(Exact same as REACT-303)*

    **`App.jsx`**
    ```jsx
    import { useContext, useCallback } from "react";
    import { BoardContext, BoardProvider } from "./BoardContext";
    import Task from "./Task";
    import "./App.css";

    function Board() {
      const { state, dispatch } = useContext(BoardContext);

      // Memoize the drag and drop callbacks!
      const handleDragStart = useCallback((e, taskId, colId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", colId);
      }, []);

      const handleDrop = useCallback((e, targetColId) => {
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        const previousState = { ...state }; 
        dispatch({ type: "MOVE_TASK", payload: { taskId, sourceColId, targetColId, baseVersion: state.version } });
        setTimeout(() => {
          if (Math.random() > 0.8) {
            alert("API Error! Rolling back changes.");
            dispatch({ type: "SYNC", payload: previousState }); 
          }
        }, 1000);
      }, [dispatch, state.version, state]);

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {state.columns.map(col => (
              <div key={col.id} className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
                <h3>{col.title}</h3>
                {col.tasks.map(task => (
                  <Task key={task.id} task={task} onDragStart={handleDragStart} colId={col.id} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    export default function App() { return <BoardProvider><Board /></BoardProvider>; }
    ```

* **REACT-402 | Virtualized Lists**
  * **Task**: Implement a virtualized scrolling window to render only the 10 visible tasks in a column of 1000.
  * **Learning**: Windowing algorithms and DOM manipulation performance.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for virtualization libraries (`FixedSizeList`) or `window` calculations.
  * **Solution**:
    **`Task.jsx`**
    *(Same as REACT-401)*
    
    **`BoardContext.jsx`**
    *(Same as REACT-303)*

    **`App.jsx`**
    ```jsx
    import { useContext, useCallback } from "react";
    import { FixedSizeList as List } from 'react-window';
    import { BoardContext, BoardProvider } from "./BoardContext";
    import Task from "./Task";
    import "./App.css";

    function Board() {
      const { state, dispatch } = useContext(BoardContext);
      
      const handleDragStart = useCallback((e, taskId, colId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", colId);
      }, []);

      const handleDrop = useCallback((e, targetColId) => {
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        const previousState = { ...state }; 
        dispatch({ type: "MOVE_TASK", payload: { taskId, sourceColId, targetColId, baseVersion: state.version } });
        setTimeout(() => {
          if (Math.random() > 0.8) dispatch({ type: "SYNC", payload: previousState }); 
        }, 1000);
      }, [dispatch, state.version, state]);

      return (
        <div className="board-container">
          <h1>Kanban Board</h1>
          <div className="board">
            {state.columns.map(col => (
              <div key={col.id} className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
                <h3>{col.title}</h3>
                <List height={400} itemCount={col.tasks.length} itemSize={50} width="100%">
                  {({ index, style }) => (
                    <div style={style}>
                      <Task task={col.tasks[index]} onDragStart={handleDragStart} colId={col.id} />
                    </div>
                  )}
                </List>
              </div>
            ))}
          </div>
        </div>
      );
    }
    export default function App() { return <BoardProvider><Board /></BoardProvider>; }
    ```

* **REACT-403 | Dark Mode Polish**
  * **Task**: Integrate the ThemeContext from Sprint 1 to turn the glassmorphic board completely dark.
  * **Learning**: CSS Variables and Context consumption.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Visual Grader strictly requires a dark mode palette (`#111827` background). Logic Grader looks for `ThemeProvider`.
  * **Solution**:
    **`ThemeContext.jsx`**
    ```jsx
    import { createContext, useState } from "react";
    export const ThemeContext = createContext();
    export function ThemeProvider({ children }) {
      const [theme, setTheme] = useState("dark");
      return (
        <ThemeContext.Provider value={{ theme }}>
          {children}
        </ThemeContext.Provider>
      );
    }
    ```
    **`Task.jsx`**
    *(Same as REACT-401)*
    
    **`BoardContext.jsx`**
    *(Same as REACT-303)*

    **`App.jsx`**
    ```jsx
    import { useContext, useCallback } from "react";
    import { FixedSizeList as List } from 'react-window';
    import { BoardContext, BoardProvider } from "./BoardContext";
    import { ThemeContext, ThemeProvider } from "./ThemeContext";
    import Task from "./Task";
    import "./App.css";

    function Board() {
      const { state, dispatch } = useContext(BoardContext);
      const { theme } = useContext(ThemeContext);
      
      const handleDragStart = useCallback((e, taskId, colId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", colId);
      }, []);

      const handleDrop = useCallback((e, targetColId) => { 
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        const previousState = { ...state }; 
        dispatch({ type: "MOVE_TASK", payload: { taskId, sourceColId, targetColId, baseVersion: state.version } });
        setTimeout(() => {
          if (Math.random() > 0.8) dispatch({ type: "SYNC", payload: previousState }); 
        }, 1000);
      }, [dispatch, state.version, state]);

      return (
        <div className={`board-container ${theme === 'dark' ? 'dark-mode' : ''}`}>
          <h1>Kanban Board</h1>
          <div className="board">
            {state.columns.map(col => (
              <div key={col.id} className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
                <h3>{col.title}</h3>
                <List height={400} itemCount={col.tasks.length} itemSize={50} width="100%">
                  {({ index, style }) => (
                    <div style={style}>
                      <Task task={col.tasks[index]} onDragStart={handleDragStart} colId={col.id} />
                    </div>
                  )}
                </List>
              </div>
            ))}
          </div>
        </div>
      );
    }
    export default function App() { 
      return (
        <ThemeProvider>
          <BoardProvider>
            <Board />
          </BoardProvider>
        </ThemeProvider>
      ); 
    }
    ```
    **`App.css`**
    ```css
    .board-container { padding: 3rem 2rem; font-family: 'Inter', sans-serif; min-height: 100vh; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }
    .board-container h1 { font-size: 2.5rem; color: #2563eb; margin-bottom: 2rem; text-align: center; font-weight: 800; letter-spacing: -0.025em; margin-top: 0; }
    .board { display: flex; gap: 1.5rem; align-items: flex-start; max-width: 1200px; margin: 0 auto; }
    .column { flex: 1; background: rgba(239, 246, 255, 0.8); backdrop-filter: blur(10px); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; min-height: 300px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }
    .column h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #bfdbfe; padding-bottom: 0.5rem; }
    .task { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 0.75rem; cursor: grab; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid #3b82f6; color: #4b5563; font-weight: 600; }
    
    .dark-mode { background: #111827 !important; color: #f9fafb; }
    .dark-mode .column { background: rgba(31, 41, 55, 0.8) !important; border-color: #374151 !important; }
    .dark-mode h1 { color: #f9fafb; }
    .dark-mode h3 { color: #f9fafb; }
    .dark-mode .task { background: #374151; color: #f9fafb; }
    ```

* **REACT-404 | Confetti on Complete**
  * **Task**: Trigger an animation when all tasks hit the "Done" column.
  * **Learning**: Integrating non-React DOM libraries (Canvas).
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader checks for `confetti` or `canvas` usage.
  * **Solution**:
    **`ThemeContext.jsx`**
    *(Same as REACT-403)*
    
    **`Task.jsx`**
    *(Same as REACT-401)*
    
    **`BoardContext.jsx`**
    *(Same as REACT-303)*

    **`App.jsx`**
    ```jsx
    import { useEffect, useContext, useCallback } from "react";
    import confetti from "canvas-confetti";
    import { FixedSizeList as List } from 'react-window';
    import { BoardContext, BoardProvider } from "./BoardContext";
    import { ThemeContext, ThemeProvider } from "./ThemeContext";
    import Task from "./Task";
    import "./App.css";

    function Board() {
      const { state, dispatch } = useContext(BoardContext);
      const { theme } = useContext(ThemeContext);

      useEffect(() => {
        if (state.columns[0].tasks.length === 0 && state.columns[1].tasks.length === 0) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      }, [state.columns]);

      const handleDragStart = useCallback((e, taskId, colId) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", colId);
      }, []);

      const handleDrop = useCallback((e, targetColId) => { 
        const taskId = parseInt(e.dataTransfer.getData("taskId"));
        const sourceColId = e.dataTransfer.getData("sourceColId");
        const previousState = { ...state }; 
        dispatch({ type: "MOVE_TASK", payload: { taskId, sourceColId, targetColId, baseVersion: state.version } });
        setTimeout(() => {
          if (Math.random() > 0.8) dispatch({ type: "SYNC", payload: previousState }); 
        }, 1000);
      }, [dispatch, state.version, state]);

      return (
        <div className={`board-container ${theme === 'dark' ? 'dark-mode' : ''}`}>
          <h1>Kanban Board</h1>
          <div className="board">
            {state.columns.map(col => (
              <div key={col.id} className="column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
                <h3>{col.title}</h3>
                <List height={400} itemCount={col.tasks.length} itemSize={50} width="100%">
                  {({ index, style }) => (
                    <div style={style}>
                      <Task task={col.tasks[index]} onDragStart={handleDragStart} colId={col.id} />
                    </div>
                  )}
                </List>
              </div>
            ))}
          </div>
        </div>
      );
    }
    export default function App() { 
      return (
        <ThemeProvider>
          <BoardProvider>
            <Board />
          </BoardProvider>
        </ThemeProvider>
      ); 
    }
    ```

---

## 🏃‍♂️ Sprint 5: Real-Time Chat App (Slack Clone) 🆕

**Goal**: The ultimate capstone. A fully Real-Time WebSocket-driven chat application.

* **REACT-501 | Message Feed UI**
  * **Task**: Build the core chat interface with a sticky message input.
  * **Learning**: Flexbox `flex-direction: column` layouts and scrolling containers.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Visual Grader expects a bottom-aligned input area and the "General Chat" header. Logic Grader expects array mapping (`.map`) and specific CSS classes (`.chat-input-area`).
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState } from "react";
    import "./App.css";

    export default function App() {
      const [messages, setMessages] = useState([
        { id: 1, text: "Hello!" },
        { id: 2, text: "Hi there!" }
      ]);
      const [text, setText] = useState("");

      return (
        <div className="chat-container">
          <div className="chat-header">General Chat</div>
          <div className="chat-feed">
            {messages.map(msg => (
              <div key={msg.id} className="message">{msg.text}</div>
            ))}
          </div>
          <div className="chat-input-area">
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Type a message..." 
            />
            <button onClick={() => {
              setMessages([...messages, { id: Date.now(), text }]);
              setText("");
            }}>
              Send
            </button>
          </div>
        </div>
      );
    }
    ```

* **REACT-502 | WebSocket Integration**
  * **Task**: Connect to a live WebSocket server to listen for new messages instantly without polling.
  * **Learning**: Initializing WebSockets, cleaning up connections on unmount, and managing external subscriptions in React.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader explicitly checks for `useEffect` and `WebSocket` initialization.
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState, useEffect } from "react";
    import "./App.css";

    export default function App() {
      const [messages, setMessages] = useState([]);
      const [ws, setWs] = useState(null);
      const [text, setText] = useState("");

      useEffect(() => {
        // Using a real public echo server so you can see it work!
        const socket = new WebSocket("wss://ws.postman-echo.com/raw");
        
        socket.onmessage = (event) => {
          const newMsg = JSON.parse(event.data);
          setMessages(prev => [...prev, newMsg]);
        };

        setWs(socket);

        return () => {
          socket.close();
        };
      }, []);

      const sendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: Date.now(), text }));
          setText("");
        }
      };

      return (
        <div className="chat-container">
          <div className="chat-header">General Chat</div>
          <div className="chat-feed">
            {messages.map(msg => (
              <div key={msg.id} className="message">{msg.text}</div>
            ))}
          </div>
          <div className="chat-input-area">
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Type a message..." 
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      );
    }
    ```

* **REACT-503 | Auto-Scroll to Bottom**
  * **Task**: Automatically scroll the chat window down when a new message arrives.
  * **Learning**: Using the `useRef` hook to directly access and manipulate DOM nodes.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader expects `useRef` and `scrollIntoView` invocations.
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState, useEffect, useRef } from "react";
    import "./App.css";

    export default function App() {
      const [messages, setMessages] = useState([]);
      const [ws, setWs] = useState(null);
      const [text, setText] = useState("");
      const bottomRef = useRef(null);

      useEffect(() => {
        // Using a real public echo server so you can see it work!
        const socket = new WebSocket("wss://ws.postman-echo.com/raw");
        
        socket.onmessage = (event) => {
          const newMsg = JSON.parse(event.data);
          setMessages(prev => [...prev, newMsg]);
        };

        setWs(socket);

        return () => {
          socket.close();
        };
      }, []);

      useEffect(() => {
        // Smooth scroll to the bottom element whenever messages array changes
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, [messages]);

      const sendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: Date.now(), text }));
          setText("");
        }
      };

      return (
        <div className="chat-container">
          <div className="chat-header">General Chat</div>
          <div className="chat-feed">
            {messages.map(msg => <div key={msg.id} className="message">{msg.text}</div>)}
            {/* Invisible anchor div at the bottom of the feed */}
            <div ref={bottomRef} /> 
          </div>
          <div className="chat-input-area">
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Type a message..." 
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      );
    }
    ```

* **REACT-504 | Infinite Scroll Pagination**
  * **Task**: When the user scrolls to the top of the chat, automatically fetch the next page of older messages.
  * **Learning**: The `IntersectionObserver` API and scroll position retention.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Review the documentation for the hooks mentioned in the learning objectives., Try logging your variables to the console to see their values.
  * **Common Mistakes**: Using inline styles instead of CSS classes., Forgetting to export the component.
  * **Evaluation**: Logic Grader explicitly checks for the usage of `IntersectionObserver`.
  * **Solution**:
    **`App.jsx`**
    ```jsx
    import { useState, useEffect, useRef } from "react";
    import "./App.css";

    export default function App() {
      const [messages, setMessages] = useState([]);
      const [ws, setWs] = useState(null);
      const [text, setText] = useState("");
      const topRef = useRef(null);

      const fetchOlderMessages = async () => {
        // Simulated fetch: generate 20 messages so it pushes the sentinel out of view!
        const batch = Array.from({ length: 20 }).map((_, i) => ({
          id: Date.now() + i,
          text: `Older message...`
        }));
        setMessages(prev => [...batch, ...prev]);
      };

      useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
          // If the top sentinel is visible in the viewport, fetch more data
          if (entry.isIntersecting) {
            fetchOlderMessages();
          }
        });

        if (topRef.current) {
          observer.observe(topRef.current);
        }

        return () => observer.disconnect();
      }, []);

      useEffect(() => {
        // Using a real public echo server so you can see it work!
        const socket = new WebSocket("wss://ws.postman-echo.com/raw");
        
        socket.onmessage = (event) => {
          const newMsg = JSON.parse(event.data);
          setMessages(prev => [...prev, newMsg]);
        };

        setWs(socket);

        return () => {
          socket.close();
        };
      }, []);

      const sendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: Date.now(), text }));
          setText("");
        }
      };

      return (
        <div className="chat-container">
          <div className="chat-header">General Chat</div>
          <div className="chat-feed">
            {/* Invisible sentinel div at the top of the feed */}
            <div ref={topRef} />
            {messages.map(msg => <div key={msg.id} className="message">{msg.text}</div>)}
          </div>
          <div className="chat-input-area">
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Type a message..." 
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      );
    }
    ```
