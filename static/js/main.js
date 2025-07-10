// Selectors
const toDoInput = document.querySelector('.todo-input');
const toDoBtn = document.querySelector('.todo-btn');
const toDoList = document.querySelector('.todo-list');
const standardTheme = document.querySelector('.standard-theme');
const lightTheme = document.querySelector('.light-theme');
const darkerTheme = document.querySelector('.darker-theme');

// Event Listeners
toDoBtn.addEventListener('click', addToDo);
toDoList.addEventListener('click', deleteCheck);
document.addEventListener("DOMContentLoaded", fetchTodosFromDB);
standardTheme.addEventListener('click', () => changeTheme('standard'));
lightTheme.addEventListener('click', () => changeTheme('light'));
darkerTheme.addEventListener('click', () => changeTheme('darker'));

// Apply saved theme or default to standard
let savedTheme = localStorage.getItem('savedTheme');
savedTheme === null ?
    changeTheme('standard')
    : changeTheme(savedTheme);

// --- Functions ---

async function addToDo(event) {
    event.preventDefault();

    if (toDoInput.value === '') {
        showToast("You must write something!");
        // alert("You must write something!");
        return;
    }

    try {
        const response = await fetch('/add_goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal_name: toDoInput.value,
                status: false
            })
        });

        if (!response.ok) throw new Error('Failed to add goal');
        showToast("Added Goal Successfully!");
        const data = await response.json();
        // console.log('data :',data)
        // Build and append the new todo DOM element with returned ID
        appendTodoToDOM(data.goal, data.goal_id || data.id, data.is_success || false);

        toDoInput.value = '';

    } catch (error) {
        console.error('Error:', error);
        showToast("Failed to save goal. Try again.");
        // alert("Failed to save goal. Try again.");
    }
}

function appendTodoToDOM(goalName, goalId, isSuccess) {
    // console.log('Appending todo:', goalName, goalId, isSuccess);
    const toDoDiv = document.createElement("li");
    toDoDiv.classList.add('todo', `${savedTheme}-todo`);
    if (isSuccess) toDoDiv.classList.add('completed');

    // Store the goal ID on the element
    toDoDiv.dataset.goalId = goalId;

    const newToDo = document.createElement('li');
    newToDo.innerText = goalName;
    newToDo.classList.add('todo-item');
    toDoDiv.appendChild(newToDo);

    // Check button
    const checked = document.createElement('button');
    checked.innerHTML = '<i class="fas fa-check"></i>';
    checked.classList.add('check-btn', `${savedTheme}-button`);
    toDoDiv.appendChild(checked);

    // Delete button
    const deleted = document.createElement('button');
    deleted.innerHTML = '<i class="fas fa-trash"></i>';
    deleted.classList.add('delete-btn', `${savedTheme}-button`);
    toDoDiv.appendChild(deleted);

    toDoList.appendChild(toDoDiv);
}

async function fetchTodosFromDB() {
    try {
        const response = await fetch('/get_goals');
        if (!response.ok) throw new Error('Failed to fetch goals');

        const data = await response.json(); 

        data.goals
            .filter(goal => !goal.isSuccess) 
            .forEach(goal => {
                appendTodoToDOM(goal.goal_name, goal.id, goal.isSuccess);
            });

    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}


function deleteCheck(event) {
    const item = event.target;
    // Delete
    if (item.classList.contains('delete-btn')) {
        const todoDiv = item.parentElement;
        // console.log('todoDiv obj:',todoDiv.dataset)
        const goalId = todoDiv.dataset.goalId;
        // console.log("goalId to delete:", goalId); 
        todoDiv.classList.add("fall");

        removeGoalFromDB(goalId)
        .then(() => {
            todoDiv.addEventListener('transitionend', () => {
                todoDiv.remove();
            });
        })
        .catch(err => {
            console.error("Failed to remove from DB:", err);
            showToast("Could not delete goal.");
            // alert("Could not delete goal.");
            todoDiv.classList.remove("fall"); // Undo animation on fail
        });
    }

    // Check (toggle done)
    if (item.classList.contains('check-btn')) {
    const todoDiv = item.parentElement;
    todoDiv.classList.toggle("completed");
    const goalId = todoDiv.dataset.goalId;
    const newStatus = todoDiv.classList.contains("completed");

    updateGoalStatus(goalId, newStatus)
        .then(() => {
            // Remove from page if marked as completed
            if (newStatus) {
                todoDiv.classList.add("markedDone"); // optional animation class
                todoDiv.addEventListener("transitionend", () => {
                    todoDiv.remove();
                });
            }
        })
        .catch(err => {
            console.error("Failed to update status:", err);
            showToast("Could not update goal status.");
            // revert the toggle if failed
            todoDiv.classList.toggle("completed");
        });
}

}

async function removeGoalFromDB(goalId) {
    const response = await fetch('/remove_goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId })
    });

    let result;

    try {
        // Try parsing as JSON
        result = await response.clone().json(); 
    } catch (err) {
        const text = await response.text(); // fallback read
        console.error("Non-JSON response:", text);
        throw new Error("Invalid response from server");
    }

    if (!response.ok) {
        console.error("Error response from server:", result);
        throw new Error(result.message || 'Failed to delete goal');
    }
    showToast("Removed Goal Successfully!");
    return result;
}



async function updateGoalStatus(goalId, isSuccess) {
    // You need to create this endpoint in Flask to update status
    const response = await fetch('/update_goal_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId, is_success: isSuccess })
    });
    if (!response.ok) throw new Error('Failed to update goal status');
    showToast("You did a great job!!");
    return response.json();
}


// Theme related functions unchanged
function changeTheme(color) {
    localStorage.setItem('savedTheme', color);
    savedTheme = color;

    document.body.className = color;
    color === 'darker' ? 
        document.getElementById('title').classList.add('darker-title')
        : document.getElementById('title').classList.remove('darker-title');

    document.querySelector('input').className = `${color}-input`;
    document.querySelectorAll('.todo').forEach(todo => {
        todo.classList.contains('completed') ? 
            todo.className = `todo ${color}-todo completed`
            : todo.className = `todo ${color}-todo`;
    });
    document.querySelectorAll('button').forEach(button => {
        if (button.classList.contains('check-btn')) {
            button.className = `check-btn ${color}-button`;
        } else if (button.classList.contains('delete-btn')) {
            button.className = `delete-btn ${color}-button`;
        } else if (button.classList.contains('todo-btn')) {
            button.className = `todo-btn ${color}-button`;
        }
    });
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}