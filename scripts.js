// scripts.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const notesGrid = document.getElementById('notesGrid');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
  const noteForm = document.getElementById('noteForm');
  const noteModalLabel = document.getElementById('noteModalLabel');
  const noteIdInput = document.getElementById('noteId');
  const noteTitleInput = document.getElementById('noteTitle');
  const noteContentInput = document.getElementById('noteContent');
  const noteCategoryInput = document.getElementById('noteCategory');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');

  // Storage keys
  const NOTES_KEY = 'notesNestNotes';
  const COMPLETED_KEY = 'notesNestCompleted';

  // Load notes (active) and completed notes
  let notes = [];
  let completedNotes = [];
  try { notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch { notes = []; }
  try { completedNotes = JSON.parse(localStorage.getItem(COMPLETED_KEY)) || []; } catch { completedNotes = []; }

  // Ensure sequential order for active notes
  function ensureOrder() {
    notes = notes
      .map((n, idx) => ({ ...n, order: typeof n.order === 'number' ? n.order : idx }))
      .sort((a, b) => a.order - b.order);
  }
  ensureOrder();

  // Editing state
  let editingNoteId = null;

  // Save helpers
  function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }
  function saveCompleted() {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedNotes));
  }

  // ID generator
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  // Render active notes only (completed are hidden from dashboard)
  function renderNotes() {
    notesGrid.innerHTML = '';

    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const rawCategory = (categoryFilter?.value || '').trim();
    const category = rawCategory === 'all' ? '' : rawCategory;

    const filteredNotes = notes
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter(n => {
        const matchesCategory = !category || n.category === category;
        const hay = `${n.title || ''} ${n.content || ''} ${n.category || ''}`.toLowerCase();
        const matchesSearch = !searchTerm || hay.includes(searchTerm);
        return matchesCategory && matchesSearch;
      });

    filteredNotes.forEach(note => {
      const col = document.createElement('div');
      col.className = 'col-sm-6 col-md-4 col-lg-3 d-flex';
      col.setAttribute('draggable', 'true');
      col.dataset.id = note.id;

      const card = document.createElement('div');
      card.className = 'card shadow-sm w-100';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'card-header fw-semibold text-truncate';
      cardHeader.title = note.title;
      cardHeader.textContent = note.title;

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      cardBody.textContent = note.content;

      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer d-flex align-items-center gap-2';

      const categoryBadge = document.createElement('span');
      categoryBadge.className = 'badge bg-primary me-auto';
      categoryBadge.textContent = note.category;

      // ✅ Mark Completed button
      const completeBtn = document.createElement('button');
      completeBtn.type = 'button';
      completeBtn.className = 'btn btn-link p-0 text-success';
      completeBtn.setAttribute('aria-label', 'Mark completed');
      completeBtn.title = 'Mark completed';
      completeBtn.innerHTML = '<i class="bi bi-check2-circle"></i>';
      completeBtn.addEventListener('click', () => completeNote(note.id));

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-link p-0 me-2';
      editBtn.setAttribute('aria-label', 'Edit note');
      editBtn.title = 'Edit';
      editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
      editBtn.addEventListener('click', () => openEditModal(note.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-link p-0 text-danger';
      deleteBtn.setAttribute('aria-label', 'Delete note');
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
      deleteBtn.addEventListener('click', () => deleteNote(note.id));

      cardFooter.appendChild(categoryBadge);
      cardFooter.appendChild(completeBtn);
      cardFooter.appendChild(editBtn);
      cardFooter.appendChild(deleteBtn);

      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      card.appendChild(cardFooter);

      col.appendChild(card);
      notesGrid.appendChild(col);
    });
  }

  // Add / Edit modals
  function openAddModal() {
    editingNoteId = null;
    noteModalLabel.textContent = 'Add Note';
    noteForm.reset();
    noteIdInput.value = '';
    noteCategoryInput.value = '';
    noteModal.show();
  }

  function openEditModal(id) {
    editingNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;

    noteModalLabel.textContent = 'Edit Note';
    noteIdInput.value = note.id;
    noteTitleInput.value = note.title || '';
    noteContentInput.value = note.content || '';
    noteCategoryInput.value = note.category || '';
    noteModal.show();
  }

  // Delete (active) note
  function deleteNote(id) {
    if (confirm('Are you sure you want to delete this note?')) {
      notes = notes.filter(n => n.id !== id);
      // re-index order
      notes = notes.map((n, idx) => ({ ...n, order: idx }));
      saveNotes();
      renderNotes();
    }
  }

  // ✅ Complete note: confirm → move to completed → remove from active
  function completeNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const ok = confirm('Mark this task as completed? It will move to Completed tasks.');
    if (!ok) return;

    // Remove from active
    notes = notes.filter(n => n.id !== id);
    notes = notes.map((n, idx) => ({ ...n, order: idx }));
    saveNotes();

    // Add to completed with timestamp
    const completed = {
      ...note,
      completedAt: Date.now()
    };
    completedNotes.push(completed);
    saveCompleted();

    // Re-render active dashboard (completed stay hidden here)
    renderNotes();
  }

  // Form submit (add/edit)
  noteForm.addEventListener('submit', e => {
    e.preventDefault();

    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const category = noteCategoryInput.value.trim();

    if (!title || !content || !category) {
      alert('Please fill in all fields.');
      return;
    }

    if (editingNoteId) {
      const noteIndex = notes.findIndex(n => n.id === editingNoteId);
      if (noteIndex !== -1) {
        notes[noteIndex] = { ...notes[noteIndex], title, content, category };
      }
    } else {
      notes.push({
        id: generateId(),
        title,
        content,
        category,
        created: Date.now(),
        order: notes.length
      });
    }

    saveNotes();
    renderNotes();
    noteModal.hide();
  });

  // Filters & actions
  searchInput.addEventListener('input', () => renderNotes());
  categoryFilter.addEventListener('change', () => renderNotes());
  addNoteBtn.addEventListener('click', openAddModal);

  // Initial paint
  renderNotes();

  // ── Drag & Drop (active notes only) ─────────────────────────
  let draggedId = null;
  let draggedEl = null;

  notesGrid.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('[draggable="true"]');
    if (!handle) return;
    draggedEl = handle;
    draggedId = handle.dataset.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedId);
    }
    draggedEl.style.opacity = '0.5';
  });

  notesGrid.addEventListener('dragend', () => {
    if (draggedEl) draggedEl.style.opacity = '1';
    draggedEl = null;
  });

  notesGrid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('[draggable="true"]');
    if (!target || !draggedEl || target === draggedEl) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.y + rect.height / 2;
    if (e.clientY > midY) target.after(draggedEl);
    else target.before(draggedEl);
  });

  notesGrid.addEventListener('drop', () => {
    if (!draggedEl) return;

    const prev = notes.slice();
    const newIds = [...notesGrid.querySelectorAll('[draggable="true"]')].map(el => el.dataset.id);

    notes = newIds.map((id, i) => {
      const n = prev.find(nn => nn.id === id);
      return { ...n, order: i };
    });

    saveNotes();
    renderNotes();
  });
});
