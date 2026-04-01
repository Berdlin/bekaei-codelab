
const fs = require('fs');
const path = require('path');
const { fireEvent, getByText, getByPlaceholderText } = require('@testing-library/dom');

beforeAll(() => {
    
    const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
    document.documentElement.innerHTML = html;
    
    const scriptContent = fs.readFileSync(path.resolve(__dirname, '../public/script.js'), 'utf8');
    
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.body.appendChild(scriptEl);
});

test('delete confirmation modal flow replaces card and supports undo', () => {
    
    const grid = document.getElementById('projects-grid');
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.roomId = 'test-project';
    card.innerHTML = '<h4>test-project</h4><p>desc</p>';
    grid.appendChild(card);

    
    const room = { id: 'test-project', is_public: false, owner_id: '1' };
    
    window.currentUser = { id: '1' };

    
    window.openDeleteConfirmModal(room, card);

    const modal = document.getElementById('delete-confirm-modal');
    expect(modal.classList.contains('hidden')).toBe(false);

    const input = document.getElementById('delete-confirm-input');
    const confirmBtn = document.getElementById('delete-confirm-btn');

    
    input.value = '  TEST-project  ';
    fireEvent.click(confirmBtn);

    
    expect(modal.classList.contains('hidden')).toBe(true);

    
    const placeholder = grid.querySelector('.undo-placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toMatch(/deleted/i);

    
    const undoBtn = placeholder.querySelector('.undo-btn');
    fireEvent.click(undoBtn);

    
    const restoredCard = grid.querySelector('.project-card');
    expect(restoredCard).not.toBeNull();
});
