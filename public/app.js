// public/app.js
let currentUser = {};
let cameraStream = null;
let currentCameraTarget = null;
let capturedCardBlob = null;
let capturedCabinBlobs = [];
let currentContactsData = []; // Global cache for contacts

window.addEventListener('DOMContentLoaded', () => {
  initUser();
  addPersonRow();
  fetchContacts();
});

// Replace the initUser section in public/app.js with this:

function initUser() {
  let stored = sessionStorage.getItem('neoUser');
  if (stored) {
    currentUser = JSON.parse(stored);
  } else {
    // Prompt the user for their custom name on first load
    const userChoice = prompt("Welcome! Enter your Name or Handle:", "AGENT_01");
    const chosenName = (userChoice && userChoice.trim()) ? userChoice.trim().toUpperCase() : "GUEST_AGENT";
    
    currentUser = {
      name: chosenName,
      // Generates a unique avatar based on their chosen name
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(chosenName)}`
    };
    sessionStorage.setItem('neoUser', JSON.stringify(currentUser));
  }
  
  updateUserDisplay();
}

function changeUserName() {
  const newChoice = prompt("Enter your new Name or Handle:", currentUser.name);
  if (newChoice && newChoice.trim()) {
    const cleanName = newChoice.trim().toUpperCase();
    currentUser.name = cleanName;
    currentUser.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    sessionStorage.setItem('neoUser', JSON.stringify(currentUser));
    updateUserDisplay();
  }
}

function updateUserDisplay() {
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  if (avatarEl) avatarEl.src = currentUser.avatar;
  if (nameEl) nameEl.textContent = currentUser.name;
}
function toggleModal(show) {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
    resetForm();
  }
}

// --- DYNAMIC PERSON ROWS ---
function addPersonRow() {
  const container = document.getElementById('peopleContainer');
  if (!container) return;
  const index = container.children.length;

  const div = document.createElement('div');
  div.className = "person-row bg-[#F4F3EF] border-2 border-black p-3 relative space-y-2";
  div.innerHTML = `
    ${index > 0 ? `<button type="button" onclick="this.parentElement.remove()" class="absolute top-1 right-1 text-xs font-black text-red-600">✕ REMOVE</button>` : ''}
    <input type="text" class="person-name w-full bg-white border border-black p-1.5 text-xs font-bold focus:outline-none" required placeholder="FULL NAME">
    <input type="text" class="person-role w-full bg-white border border-black p-1.5 text-xs font-bold focus:outline-none" required placeholder="ROLE / TITLE">
    <input type="tel" class="person-phone w-full bg-white border border-black p-1.5 text-xs font-bold focus:outline-none" required placeholder="PHONE NUMBER">
  `;
  container.appendChild(div);
}

// --- RELIABLE VCF DOWNLOADERS ---
function downloadPersonVCard(cardIndex, personIndex) {
  const c = currentContactsData[cardIndex];
  if (!c || !c.people || !c.people[personIndex]) return;
  const p = c.people[personIndex];

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${p.name || ''};;;;`,
    `FN:${p.name || ''}`,
    `ORG:${c.startup_name || ''}`,
    `TITLE:${p.role || ''}`,
    `TEL;TYPE=CELL,VOICE:${p.phone || ''}`,
    'END:VCARD'
  ];

  const blob = new Blob([vcardLines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;

  const cleanName = (p.name || 'contact').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanStartup = (c.startup_name || 'startup').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanRole = (p.role || 'role').replace(/[^a-zA-Z0-9]/g, '_');

  a.download = `${cleanName}_${cleanStartup}_${cleanRole}.vcf`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 300);
}

function downloadCardVCard(cardIndex) {
  const c = currentContactsData[cardIndex];
  if (!c || !c.people || c.people.length === 0) return;

  const vcardBlocks = c.people.map(p => [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${p.name || ''};;;;`,
    `FN:${p.name || ''}`,
    `ORG:${c.startup_name || ''}`,
    `TITLE:${p.role || ''}`,
    `TEL;TYPE=CELL,VOICE:${p.phone || ''}`,
    'END:VCARD'
  ].join('\r\n'));

  const blob = new Blob([vcardBlocks.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;

  const cleanStartup = (c.startup_name || 'startup').replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `${cleanStartup}_all_contacts.vcf`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 300);
}

// --- MEDIA EXPLORER MODAL ---
function openExplorerModal(cardIndex) {
  const c = currentContactsData[cardIndex];
  if (!c || !c.cabin_media_urls || c.cabin_media_urls.length === 0) return;

  const modal = document.getElementById('mediaExplorerModal');
  const grid = document.getElementById('explorerGrid');
  const title = document.getElementById('explorerTitle');

  if (!modal || !grid) return;

  if (title) title.textContent = `// MEDIA_EXPLORER: ${c.startup_name}`;
  grid.innerHTML = '';

  c.cabin_media_urls.forEach((m, mIdx) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = "bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_#000] flex flex-col justify-between space-y-2";

    let mediaElement = '';
    if (m.type && m.type.startsWith('video/')) {
      mediaElement = `<video src="${m.url}" controls class="w-full h-40 border border-black object-cover bg-black"></video>`;
    } else {
      mediaElement = `<img src="${m.url}" onclick="openLightbox(${cardIndex}, ${mIdx})" class="w-full h-40 border border-black object-cover cursor-pointer hover:opacity-90">`;
    }

    itemDiv.innerHTML = `
      ${mediaElement}
      <button type="button" onclick="openLightbox(${cardIndex}, ${mIdx})" class="w-full bg-[#FFE600] border border-black font-black text-[10px] p-1 uppercase shadow-[1px_1px_0px_0px_#000]">
        FULL_INSPECT
      </button>
    `;
    grid.appendChild(itemDiv);
  });

  modal.classList.remove('hidden');
}

function closeExplorerModal() {
  const modal = document.getElementById('mediaExplorerModal');
  if (modal) modal.classList.add('hidden');
}

// --- LIGHTBOX INSPECTOR ---
function openLightbox(cardIndex, mediaIndex) {
  const c = currentContactsData[cardIndex];
  if (!c || !c.cabin_media_urls || !c.cabin_media_urls[mediaIndex]) return;

  const media = c.cabin_media_urls[mediaIndex];
  const lightbox = document.getElementById('mediaLightbox');
  const content = document.getElementById('lightboxContent');

  if (!lightbox || !content) return;

  if (media.type && media.type.startsWith('video/')) {
    content.innerHTML = `<video src="${media.url}" controls autoplay class="max-w-full max-h-[70vh] object-contain"></video>`;
  } else {
    content.innerHTML = `<img src="${media.url}" class="max-w-full max-h-[70vh] object-contain">`;
  }
  lightbox.classList.remove('hidden');
}

function openVisitingCardModal(cardIndex) {
  const c = currentContactsData[cardIndex];
  if (!c || !c.visiting_card_url) return;

  const lightbox = document.getElementById('mediaLightbox');
  const content = document.getElementById('lightboxContent');

  if (!lightbox || !content) return;

  content.innerHTML = `<img src="${c.visiting_card_url}" class="max-w-full max-h-[70vh] object-contain">`;
  lightbox.classList.remove('hidden');
}

function closeLightbox() {
  const lightbox = document.getElementById('mediaLightbox');
  if (lightbox) lightbox.classList.add('hidden');
}

// --- WEBCAM STREAM ---
async function openCamera(target) {
  currentCameraTarget = target;
  const cameraModal = document.getElementById('cameraModal');
  const video = document.getElementById('webcamVideo');
  if (!cameraModal || !video) return;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = cameraStream;
    cameraModal.classList.remove('hidden');
  } catch (err) {
    alert("Camera Access Denied or Unavailable!");
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const cameraModal = document.getElementById('cameraModal');
  if (cameraModal) cameraModal.classList.add('hidden');
}

function captureWebcamFrame() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('snapshotCanvas');
  if (!video || !canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (currentCameraTarget === 'cabin') {
      capturedCabinBlobs.push(blob);
      renderCabinPreviews();
    } else if (currentCameraTarget === 'visitingCard') {
      capturedCardBlob = blob;
      renderCardPreview(URL.createObjectURL(blob));
    }
    closeCamera();
  }, 'image/jpeg', 0.8);
}

function previewCabinFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => capturedCabinBlobs.push(file));
  renderCabinPreviews();
}

function renderCabinPreviews() {
  const container = document.getElementById('cabinPreview');
  if (!container) return;
  container.innerHTML = '';
  capturedCabinBlobs.forEach((item, index) => {
    const url = item instanceof Blob ? URL.createObjectURL(item) : '';
    const div = document.createElement('div');
    div.className = "w-14 h-14 border-2 border-black bg-black flex items-center justify-center overflow-hidden relative";
    div.innerHTML = `<img src="${url}" class="w-full h-full object-cover"><span class="absolute bottom-0 right-0 bg-yellow-400 text-[9px] font-black px-1">${index + 1}</span>`;
    container.appendChild(div);
  });
}

function previewCardFile(e) {
  const file = e.target.files[0];
  if (file) {
    capturedCardBlob = file;
    renderCardPreview(URL.createObjectURL(file));
  }
}

function renderCardPreview(url) {
  const container = document.getElementById('cardPreview');
  if (!container) return;
  container.innerHTML = `
    <div class="w-full h-24 border-2 border-black bg-black overflow-hidden relative">
      <img src="${url}" class="w-full h-full object-cover">
      <span class="absolute bottom-1 right-1 bg-[#A3E635] border border-black text-[9px] font-black px-1">CARD_ATTACHED</span>
    </div>
  `;
}

function resetForm() {
  const form = document.getElementById('addContactForm');
  if (form) form.reset();

  const cabinPrev = document.getElementById('cabinPreview');
  if (cabinPrev) cabinPrev.innerHTML = '';

  const cardPrev = document.getElementById('cardPreview');
  if (cardPrev) cardPrev.innerHTML = '';

  const peopleCont = document.getElementById('peopleContainer');
  if (peopleCont) peopleCont.innerHTML = '';

  capturedCabinBlobs = [];
  capturedCardBlob = null;
  addPersonRow();
}

// --- FETCH & SUBMIT DATA ---
async function fetchContacts() {
  try {
    const res = await fetch('/api/contacts');
    const contacts = await res.json();
    currentContactsData = contacts;
    renderContacts(contacts);
  } catch (err) {
    console.error("Failed to fetch contacts:", err);
  }
}

document.getElementById('addContactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'STREAMING_TO_DATABASE...';
  }

  const personRows = document.querySelectorAll('.person-row');
  const peopleArray = Array.from(personRows).map(row => ({
    name: row.querySelector('.person-name')?.value.trim() || '',
    role: row.querySelector('.person-role')?.value.trim() || '',
    phone: row.querySelector('.person-phone')?.value.trim() || ''
  }));

  const formData = new FormData();
  formData.append('startupName', document.getElementById('startupName')?.value || '');
  formData.append('people', JSON.stringify(peopleArray));
  formData.append('instaHandle', document.getElementById('instaHandle')?.value || '');
  formData.append('addedByName', currentUser.name);
  formData.append('addedByAvatar', currentUser.avatar);

  if (capturedCardBlob) {
    formData.append('visitingCard', capturedCardBlob, 'card.jpg');
  }

  capturedCabinBlobs.forEach((blob, i) => {
    formData.append('cabinMedia', blob, `cabin_${i}.jpg`);
  });

  try {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Server error');
    }

    toggleModal(false);
    fetchContacts();
  } catch (err) {
    console.error(err);
    alert("Data Stream Failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'SAVE_DATA_STREAM';
    }
  }
});

function renderContacts(contacts) {
  const grid = document.getElementById('contactsGrid');
  const countEl = document.getElementById('contactCount');
  if (!grid) return;

  if (countEl) countEl.textContent = `${contacts.length} UNITS`;
  grid.innerHTML = '';

  contacts.forEach((c, index) => {
    const card = document.createElement('div');
    card.className = "bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between space-y-4";

    const hasMedia = c.cabin_media_urls && c.cabin_media_urls.length > 0;
    const mediaCount = hasMedia ? c.cabin_media_urls.length : 0;

    let mainMediaHtml = '';
    if (hasMedia) {
      const firstMedia = c.cabin_media_urls[0];
      if (firstMedia.type && firstMedia.type.startsWith('video/')) {
        mainMediaHtml = `<video src="${firstMedia.url}" controls class="w-full h-44 border-2 border-black object-cover bg-black"></video>`;
      } else {
        mainMediaHtml = `<img src="${firstMedia.url}" onclick="openLightbox(${index}, 0)" class="w-full h-44 border-2 border-black object-cover cursor-pointer hover:opacity-90">`;
      }
    }

    let peopleHtml = '';
    if (c.people && c.people.length > 0) {
      peopleHtml = c.people.map((p, pIdx) => `
        <div class="bg-[#F4F3EF] border-2 border-black p-2.5 space-y-1 text-xs relative">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-black uppercase"><i class="fa-solid fa-user mr-1"></i> ${p.name}</p>
              <p class="font-bold text-gray-700 uppercase text-[11px]"><i class="fa-solid fa-briefcase mr-1"></i> ${p.role}</p>
              <p class="font-bold text-indigo-700 text-[11px]"><i class="fa-solid fa-phone mr-1"></i> ${p.phone}</p>
            </div>
            <button type="button" onclick="downloadPersonVCard(${index}, ${pIdx})" class="bg-[#00E5FF] hover:bg-cyan-300 border border-black font-black text-[9px] px-2 py-1 uppercase shadow-[1px_1px_0px_0px_#000]">
              <i class="fa-solid fa-download"></i> .VCF
            </button>
          </div>
        </div>
      `).join('');
    }

    card.innerHTML = `
      <div>
        ${mainMediaHtml}

        ${hasMedia ? `
          <button type="button" onclick="openExplorerModal(${index})" class="mt-2 w-full bg-[#00E5FF] hover:bg-cyan-300 border-2 border-black font-black text-xs p-2 uppercase shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
            <i class="fa-solid fa-images mr-2"></i> EXPLORE CABIN MEDIA (${mediaCount} FILES)
          </button>
        ` : ''}

        <div class="flex justify-between items-start mt-3">
          <h3 class="font-black text-lg uppercase leading-tight">${c.startup_name}</h3>
          <span class="text-xs bg-[#FF90E8] border border-black font-bold px-2 py-0.5">${c.insta_handle}</span>
        </div>

        <div class="mt-3 space-y-2">
          ${peopleHtml}
        </div>

        <button type="button" onclick="downloadCardVCard(${index})" class="mt-3 w-full bg-[#FFE600] hover:bg-yellow-300 border-2 border-black font-black text-xs p-2.5 uppercase shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
          <i class="fa-solid fa-file-arrow-down mr-2 text-sm"></i> DOWNLOAD CARD (.VCF BUNDLE)
        </button>

        ${c.visiting_card_url ? `
          <button type="button" onclick="openVisitingCardModal(${index})" class="mt-2 w-full text-center bg-slate-200 hover:bg-slate-300 border-2 border-black font-bold text-xs p-2 uppercase">
            <i class="fa-solid fa-id-card mr-1"></i> VIEW_VISITING_CARD
          </button>
        ` : ''}
      </div>

      <div class="pt-3 border-t-2 border-black flex justify-between items-center text-[10px] font-bold uppercase">
        <span>BY: ${c.added_by_name}</span>
        <span>${new Date(c.created_at).toLocaleDateString()}</span>
      </div>
    `;

    grid.appendChild(card);
  });
}