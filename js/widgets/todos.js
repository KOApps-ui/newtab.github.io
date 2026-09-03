/**
 * AuraTab Başkent - Yapılacaklar (To-Do) ve Hızlı Notlar Widget'ı
 */

import { Utils } from '../utils.js';

export class TodosWidget {
  constructor(storage, containerId = 'todosWidget') {
    this.storage = storage;
    this.containerId = containerId;
    this.container = null;
    this.todos = [];
    this.activeTab = 'todos'; // 'todos' | 'notes'
    this.quickNotes = '';
  }

  async init() {
    this.container = document.getElementById(this.containerId);
    this.todos = await this.storage.getTodos();
    this.quickNotes = await this.storage.getQuickNotes();
    this.render();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="widget-header">
        <div class="widget-title-group">
          <div class="widget-icon">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span class="widget-title">Üretkenlik & Notlar</span>
        </div>
      </div>

      <div class="todos-tabs">
        <button class="todo-tab-btn ${this.activeTab === 'todos' ? 'active' : ''}" data-tab="todos">
          ✓ Görevler (${this.todos.filter(t => !t.completed).length})
        </button>
        <button class="todo-tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
          📝 Hızlı Not Defteri
        </button>
      </div>

      ${this.activeTab === 'todos' ? `
        <form class="todo-input-row" id="addTodoForm">
          <input type="text" class="todo-input-field" id="todoTextInput" placeholder="Yeni bir görev ekle..." required>
          <button type="submit" class="todo-add-btn">＋ Ekle</button>
        </form>
        <div class="todo-list-container" id="todoList">
          ${this.todos.length === 0 ? `
            <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.75rem;">
              Tüm görevler tamamlandı! 🎉
            </div>
          ` : this.todos.map(t => `
            <div class="todo-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
              <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} data-toggle-id="${t.id}">
              <span class="todo-text">${Utils.escapeHTML(t.text)}</span>
              <button class="todo-delete-btn" data-delete-id="${t.id}" title="Görevi Sil">✕</button>
            </div>
          `).join('')}
        </div>
      ` : `
        <textarea class="quick-notes-textarea" id="quickNotesArea" placeholder="Aklına gelenleri buraya yaz...">${Utils.escapeHTML(this.quickNotes)}</textarea>
        <div style="font-size:0.68rem;color:var(--text-muted);text-align:right;margin-top:4px;">
          ⚡ Otomatik kaydedilir
        </div>
      `}
    `;
  }

  bindEvents() {
    this.container.addEventListener('click', async (e) => {
      // Tab switcher
      const tabBtn = e.target.closest('.todo-tab-btn');
      if (tabBtn) {
        this.activeTab = tabBtn.getAttribute('data-tab');
        this.render();
        return;
      }

      // Toggle complete
      const toggleBox = e.target.closest('[data-toggle-id]');
      if (toggleBox) {
        const id = toggleBox.getAttribute('data-toggle-id');
        const item = this.todos.find(t => t.id === id);
        if (item) {
          item.completed = toggleBox.checked;
          await this.storage.saveTodos(this.todos);
          this.render();
        }
        return;
      }

      // Delete item
      const delBtn = e.target.closest('[data-delete-id]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-delete-id');
        this.todos = this.todos.filter(t => t.id !== id);
        await this.storage.saveTodos(this.todos);
        this.render();
        return;
      }
    });

    // Add Form submit
    this.container.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'addTodoForm') {
        e.preventDefault();
        const input = document.getElementById('todoTextInput');
        const text = input ? input.value.trim() : '';
        if (text) {
          this.todos.unshift({
            id: 'td_' + Date.now(),
            text: text,
            completed: false
          });
          await this.storage.saveTodos(this.todos);
          this.render();
        }
      }
    });

    // Notes auto save
    this.container.addEventListener('input', Utils.debounce(async (e) => {
      if (e.target && e.target.id === 'quickNotesArea') {
        this.quickNotes = e.target.value;
        await this.storage.saveQuickNotes(this.quickNotes);
      }
    }, 400));
  }
}
