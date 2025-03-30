document.addEventListener("DOMContentLoaded", function() {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyA1kGDOAuQRqdgXHX3Ugjj_zL7_bqYXos0",
    authDomain: "myapp-3a874.firebaseapp.com",
    projectId: "myapp-3a874",
    storageBucket: "myapp-3a874.appspot.com",
    messagingSenderId: "430236087961",
    appId: "1:430236087961:web:d7b0e75c6cf2498c9b6a08"
  };
  firebase.initializeApp(firebaseConfig);

  const firestore = firebase.firestore(),
        auth = firebase.auth(),
        storage = firebase.storage();

  // Generate avatar from initial
  function generateAvatarInitial(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#007bff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    ctx.fillText(initial, 50, 50);
    return canvas.toDataURL();
  }

  // Auth state change
  auth.onAuthStateChanged(user => {
    const loginModal = document.getElementById("loginModal");
    loginModal.style.display = user ? "none" : "flex";
    if (user) {
      const profilePicElem = document.getElementById("profilePic");
      if (profilePicElem) {
        if (user.photoURL) {
          profilePicElem.src = user.photoURL;
        } else {
          const name = user.displayName || (user.email ? user.email.split('@')[0] : "Guest");
          profilePicElem.src = generateAvatarInitial(name);
        }
      }
    }
  });

  // Strict Gmail validation (adjust regex if you want to allow plus signs)
  function isValidGmail(email) {
    return /^[a-zA-Z0-9._]+@gmail\.com$/i.test(email);
  }

  // Escape HTML to prevent XSS
  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(match) {
      const escape = { 
        '&': '&amp;', 
        '<': '&lt;', 
        '>': '&gt;', 
        '"': '&quot;', 
        "'": '&#39;' 
      };
      return escape[match];
    });
  }

  // Forbid "empathy" content
  function containsForbiddenContent(text) {
    return text.toLowerCase().includes("empathy");
  }

  // DOM elements for login/signup
  const loginBtn = document.getElementById('loginBtn'),
        signupBtn = document.getElementById('signupBtn'),
        loginEmail = document.getElementById('loginEmail'),
        loginPassword = document.getElementById('loginPassword');

  // Login
  loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim(),
          password = loginPassword.value.trim();
    if (!isValidGmail(email)) {
      alert("Enter a valid @gmail.com address with only letters, numbers, dots, or underscores.");
      return;
    }
    if (email && password) {
      auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          user.reload().then(() => {
            if (!user.emailVerified) {
              user.sendEmailVerification()
                .then(() => {
                  alert("A verification email has been sent. Please verify your email before logging in.");
                  auth.signOut();
                })
                .catch(err => alert(`Verification Error: ${err.code} - ${err.message}`));
            } else {
              document.getElementById("loginModal").style.display = "none";
            }
          });
        })
        .catch(err => alert(`Login Error: ${err.code} - ${err.message}`));
    }
  });

  // Signup
  signupBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim(),
          password = loginPassword.value.trim();
    if (!isValidGmail(email)) {
      alert("Enter a valid @gmail.com address with only letters, numbers, dots, or underscores.");
      return;
    }
    if (email && password) {
      auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          return user.updateProfile({ displayName: email.split('@')[0] })
            .then(() => user.sendEmailVerification())
            .then(() => {
              alert("A verification email has been sent. Please check your inbox and verify your email before logging in.");
              auth.signOut();
            });
        })
        .catch(err => alert(`Signup Error: ${err.code} - ${err.message}`));
    }
  });

  // Google Login
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(() => {
        document.getElementById("loginModal").style.display = "none";
      })
      .catch(err => alert(`Google Login Error: ${err.code} - ${err.message}`));
  });

  // Window controls
  document.getElementById('minimizeBtn').addEventListener('click', () => window.windowControls.minimize());
  document.getElementById('maximizeBtn').addEventListener('click', () => window.windowControls.maximize());
  document.getElementById('closeBtn').addEventListener('click', () => window.windowControls.close());

  // Sidebar toggle
  document.querySelector('.hamburger').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('activate');
  });

  // About Modal
  const aboutModal = document.getElementById('aboutModal');
  document.getElementById('aboutBtn').addEventListener('click', () => aboutModal.style.display = 'flex');
  document.getElementById('closeAboutModal').addEventListener('click', () => aboutModal.style.display = 'none');
  aboutModal.addEventListener('click', e => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
  });

  // Updates Modal with WebSocket
  const updatesModal = document.getElementById('updatesModal'),
        updatesList = document.getElementById('updatesList');
  let updatesSocket = null;
  function openUpdatesModal() {
    updatesModal.style.display = 'flex';
    if (!updatesSocket) {
      updatesSocket = new WebSocket("wss://echo.websocket.org/updates");
      updatesSocket.onopen = () => {};
      updatesSocket.onmessage = e => {
        if (!e.data.startsWith("Request served by")) {
          const li = document.createElement('li');
          li.textContent = e.data;
          updatesList.appendChild(li);
        }
      };
      updatesSocket.onerror = err => console.error(err);
      updatesSocket.onclose = () => updatesSocket = null;
    }
  }
  document.getElementById('updatesBtn').addEventListener('click', openUpdatesModal);
  document.getElementById('closeUpdatesModal').addEventListener('click', () => updatesModal.style.display = 'none');
  updatesModal.addEventListener('click', e => {
    if (e.target === updatesModal) updatesModal.style.display = 'none';
  });

  // Dashboard, Chat, Forum elements
  const dashboardContainer = document.getElementById('dashboardContainer'),
        dashboardUsername = document.getElementById('dashboardUsername'),
        dashboardEmail = document.getElementById('dashboardEmail'),
        dashboardCreditsSpan = document.getElementById('dashboardCredits'),
        chatContainer = document.getElementById('chatContainer'),
        forumContainer = document.getElementById('forumContainer'),
        chatMessagesDiv = document.getElementById('chatMessages');

  // Dashboard button
  document.getElementById('dashboardBtn').addEventListener('click', async () => {
    const user = firebase.auth().currentUser;
    if (user) {
      const name = user.displayName || (user.email ? user.email.split('@')[0] : "Anonymous");
      dashboardUsername.textContent = name;
      dashboardEmail.textContent = user.email;
      const docSnap = await firestore.collection("users").doc(user.uid).get();
      dashboardCreditsSpan.textContent = docSnap.exists ? (docSnap.data().credits || 0) : 0;
    }
    chatContainer.style.display = forumContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
  });

  // Upload Profile Picture
  document.getElementById('uploadPicBtn').addEventListener('click', async () => {
    const file = document.getElementById('profilePicInput').files[0],
          user = firebase.auth().currentUser,
          profilePicImg = document.getElementById('profilePic');
    if (!file) {
      alert("Select an image file.");
      return;
    }
    if (!user) {
      alert("Login required.");
      return;
    }
    try {
      const fileRef = storage.ref().child(`profile_pics/${user.uid}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      await user.updateProfile({ photoURL: url });
      profilePicImg.src = url;
      alert("Profile picture updated.");
    } catch (err) {
      alert("Error uploading profile picture.");
    }
  });

  // Linkify function
  function linkify(text) {
    return escapeHTML(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // Render media (image/video/sticker)
  function renderMedia(url, type) {
    if (!url || !type) return "";
    if (type === "sticker") {
      return `<br><img src="${url}" style="max-width:300px; margin-top:5px; display:block;">`;
    }
    if (type.startsWith("image")) {
      return `
        <br>
        <a href="#" class="img-overlay-link" data-image="${encodeURIComponent(url)}">
          <img src="${url}" style="max-width:300px; margin-top:5px; border-radius:4px; display:block; cursor:pointer;" alt="User Uploaded Image">
        </a>
      `;
    }
    if (type.startsWith("video")) {
      return `
        <br>
        <video controls style="max-width:300px; margin-top:5px; border-radius:4px; display:block;">
          <source src="${url}" type="${type}">
          Your browser does not support the video tag.
        </video>
      `;
    }
    return "";
  }

  // Forum elements
  const forumInput = document.getElementById('forumInput'),
        forumSubmit = document.getElementById('forumSubmit'),
        forumPosts = document.getElementById('forumPosts');

  // Submit forum post
  forumSubmit.addEventListener('click', async () => {
    const text = forumInput.value.trim(),
          user = firebase.auth().currentUser;
    if (!text) {
      alert("Cannot send an empty post.");
      return;
    }
    if (containsForbiddenContent(text)) {
      alert("Empathy messages are not allowed.");
      return;
    }
    let fileUrl = "", fileType = "";
    const file = document.getElementById('forumFile').files[0];
    if (file) {
      const fileRef = storage.ref().child(`forum_files/${user.uid}_${file.name}`);
      await fileRef.put(file);
      fileUrl = await fileRef.getDownloadURL();
      fileType = file.type;
    }
    // Use user.uid for data integrity in both posts and user credits
    const userName = user ? (user.displayName || (user.email ? user.email.split('@')[0] : "Anonymous")) : "Anonymous";
    firestore.collection("forumPosts").add({
      uid: user ? user.uid : null,
      userName,
      text: escapeHTML(text),
      fileUrl,
      fileType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      time: new Date().toLocaleDateString()
    }).then(() => {
      forumInput.value = "";
      document.getElementById('forumFile').value = "";
      // Increment credits in the user's document (keyed by uid)
      firestore.collection("users").doc(user.uid).set({
        credits: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
    }).catch(err => console.error(err));
  });

  // Listen to forum posts
  firestore.collection("forumPosts").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      forumPosts.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const currentUser = firebase.auth().currentUser;
        const canDelete = currentUser && currentUser.uid === data.uid;
        const mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
        // Removed data-id from container; only add a data-doc-id attribute on the delete button.
        forumPosts.innerHTML += `
          <div class="forum-post">
            <strong style="font-size:16px; display:flex; align-items:center; gap:10px;">
              <i class="ri-corner-left-down-line" style="font-size:26px;"></i>
              ${escapeHTML(data.userName) || "Anonymous"}
              <em style="font-size:12px;">(${data.time || "Just now"})</em>
              ${canDelete ? `<button class="delete-forum-post" data-doc-id="${doc.id}">Delete</button>` : ""}
            </strong>
            <p style="font-size:14px; line-height:20px;">${linkify(data.text)}</p>
            ${mediaHtml}
          </div>`;
      });
    });

  // Chat elements
  const chatInput = document.getElementById('chatInput'),
        chatSendBtn = document.getElementById('chatSendBtn'),
        typingLoader = document.getElementById('typingLoader'),
        typingStatusCollection = firestore.collection("typingStatus");
  let typingTimeout;

  // Update typing status
  chatInput.addEventListener('input', () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const userDoc = typingStatusCollection.doc(user.uid);
    if (chatInput.value.trim() !== "") {
      userDoc.set({ typing: true, userName: user.displayName || (user.email ? user.email.split('@')[0] : "Anonymous") });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { userDoc.set({ typing: false }); }, 3000);
    } else {
      userDoc.set({ typing: false });
    }
  });

  // Send chat message on Enter (unless shift)
  chatInput.addEventListener('keydown', function(e) {
    if ((e.key === "Enter" || e.keyCode === 13) && !e.shiftKey) {
      e.preventDefault();
      chatSendBtn.click();
    }
  });

  typingStatusCollection.onSnapshot(snapshot => {
    let typingUsers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.typing && auth.currentUser && doc.id !== auth.currentUser.uid) {
        typingUsers.push(data.userName || "Someone");
      }
    });
    if (typingUsers.length > 0) {
      typingLoader.style.display = "block";
      typingLoader.textContent = typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.join(", ")} are typing...`;
    } else {
      typingLoader.style.display = "none";
    }
  });

  // Emoji & Sticker pickers
  document.getElementById('emojiToggle').addEventListener('click', () => {
    const emojiPicker = document.getElementById('emojiPicker'),
          stickerPicker = document.getElementById('stickerPicker');
    emojiPicker.style.display = (emojiPicker.style.display === 'block') ? 'none' : 'block';
    stickerPicker.style.display = 'none';
  });

  document.getElementById('stickerToggle').addEventListener('click', async () => {
    const stickerPicker = document.getElementById('stickerPicker');
    if (stickerPicker.style.display === 'block') {
      stickerPicker.style.display = 'none';
      return;
    }
    if (!stickerPicker.innerHTML.trim()) {
      const apiKey = "1FQEo2nvaarypzmTvT0RY5leH7w33EXA",
            url = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=100&rating=g`;
      try {
        const result = await (await fetch(url)).json();
        if (result.data) {
          result.data.forEach(sticker => {
            const img = document.createElement('img');
            img.src = sticker.images.fixed_width.url;
            img.dataset.sticker = sticker.images.fixed_width.url;
            stickerPicker.appendChild(img);
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    stickerPicker.style.display = 'block';
    document.getElementById('emojiPicker').style.display = 'none';
  });

  document.querySelectorAll('#emojiPicker span').forEach(emoji => {
    emoji.addEventListener('click', () => {
      chatInput.value += emoji.textContent;
    });
  });

  document.getElementById('stickerPicker').addEventListener('click', async (e) => {
    if (e.target.tagName.toLowerCase() === "img") {
      const stickerUrl = e.target.dataset.sticker,
            user = auth.currentUser,
            userName = user ? (user.displayName || (user.email ? user.email.split('@')[0] : "Guest")) : "Guest",
            photoURL = user ? user.photoURL || "" : "";
      try {
        await firestore.collection("chats").add({
          uid: user ? user.uid : null,
          userName,
          text: "",
          photoURL,
          fileUrl: stickerUrl,
          fileType: "sticker",
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('stickerPicker').style.display = 'none';
      } catch (err) {
        console.error(err);
      }
    }
  });

  // Send chat message
  chatSendBtn.addEventListener('click', async () => {
    const messageText = chatInput.value.trim(),
          user = auth.currentUser,
          userName = user ? (user.displayName || (user.email ? user.email.split('@')[0] : "Guest")) : "Guest",
          photoURL = user ? user.photoURL || "" : "";
    if (!messageText) {
      alert("Cannot send an empty message.");
      return;
    }
    if (containsForbiddenContent(messageText)) {
      alert("Empathy messages are not allowed.");
      return;
    }
    let fileUrl = "", fileType = "";
    const file = document.getElementById('chatFile').files[0];
    if (file) {
      const fileRef = storage.ref().child(`chat_files/${user.uid}_${file.name}`);
      await fileRef.put(file);
      fileUrl = await fileRef.getDownloadURL();
      fileType = file.type;
    }
    firestore.collection("chats").add({
      uid: user ? user.uid : null,
      userName,
      text: escapeHTML(messageText),
      photoURL,
      fileUrl,
      fileType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      chatInput.value = "";
      document.getElementById('chatFile').value = "";
    }).catch(err => console.error(err));
  });

  // Listen to chat messages
  firestore.collection("chats").orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      chatMessagesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const currentUser = auth.currentUser;
        const canDelete = currentUser && currentUser.uid === data.uid;
        const profileImg = data.photoURL
          ? `<img src="${data.photoURL}" style="width:40px; height:40px; border-radius:50%; margin-right:5px;">`
          : `<img src="${generateAvatarInitial(data.userName)}" style="width:40px; height:40px; border-radius:50%; margin-right:5px;">`;
        const mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
        // Removed the container's data-id attribute
        chatMessagesDiv.innerHTML += `
          <div class="chat-message">
            <div style="display:flex; flex-direction: column; margin-bottom:10px;">
              <strong style="position: relative; display: flex; align-items: center; justify-content: space-between; left: 30px; top: 17px; width: 90%; transition: all ease-in 0.2s;" class="user__name">
                ${escapeHTML(data.userName)}:
                ${canDelete ? `<i class="delete-chat-post ri-delete-bin-6-fill" style='cursor: pointer;' data-doc-id="${doc.id}"></i>` : ""}
              </strong>
              <i class="ri-corner-left-down-line" style="font-size:26px;"></i>
              <div style="width: 100%; display: flex; align-items: center; gap: 10px;">
                ${profileImg}
                <span style="font-size:17px;">${linkify(data.text)}</span>
              </div>
              ${mediaHtml}
            </div>
          </div>`;
      });
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });

  // Nav between Chat & Forum
  document.getElementById('chatBtn').addEventListener('click', () => {
    chatContainer.style.display = 'flex';
    forumContainer.style.display = dashboardContainer.style.display = 'none';
  });
  document.getElementById('forumBtn').addEventListener('click', () => {
    forumContainer.style.display = 'flex';
    chatContainer.style.display = dashboardContainer.style.display = 'none';
  });

  // Image overlay
  window.openOverlay = function(imageUrl) {
    const overlay = document.getElementById("imageOverlay");
    const overlayImage = document.getElementById("overlayImage");
    overlayImage.src = imageUrl;
    overlay.style.display = "flex";
  };

  document.getElementById("closeOverlay").addEventListener("click", function() {
    document.getElementById("imageOverlay").style.display = "none";
  });

  document.addEventListener('click', function(e) {
    const overlayLink = e.target.closest('.img-overlay-link');
    if (overlayLink) {
      e.preventDefault();
      const imageUrl = decodeURIComponent(overlayLink.getAttribute('data-image'));
      openOverlay(imageUrl);
    }
  });

  // Delete forum and chat posts
  document.addEventListener('click', async function(e) {
    // Delete forum post
    if (e.target.classList.contains('delete-forum-post')) {
      // Now using data-doc-id instead of data-id
      const id = e.target.getAttribute('data-doc-id');
      if (!confirm("Are you sure you want to delete this forum post?")) return;
      const docRef = firestore.collection("forumPosts").doc(id);
      const docSnap = await docRef.get();
      const docData = docSnap.data();
      const currentUser = auth.currentUser;
      if (!docSnap.exists) {
        alert("This post no longer exists.");
        return;
      }
      if (!currentUser || currentUser.uid !== docData.uid) {
        alert("You do not have permission to delete this post.");
        return;
      }
      docRef.delete()
        .then(() => console.log("Forum post deleted"))
        .catch(err => console.error("Error deleting forum post", err));
    }

    // Delete chat post
    if (e.target.classList.contains('delete-chat-post')) {
      const id = e.target.getAttribute('data-doc-id');
      if (!confirm("Are you sure you want to delete this chat message?")) return;
      const docRef = firestore.collection("chats").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        alert("This message no longer exists.");
        return;
      }
      const docData = docSnap.data();
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== docData.uid) {
        alert("You do not have permission to delete this message.");
        return;
      }
      docRef.delete()
        .then(() => console.log("Chat message deleted"))
        .catch(err => console.error("Error deleting chat message", err));
    }
  });
});
