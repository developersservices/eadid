class UserProtectionSystem {
  constructor() {
    this.userBehaviorProfiles = new Map();
    this.threatModels = {
      phishing: this.loadPhishingModel(),
      toxicity: this.loadToxicityModel(),
      anomaly: this.loadAnomalyDetectionModel()
    };
  }

  async analyzeUserSession(user, context) {
    const riskFactors = {
      deviceRisk: this.calculateDeviceRisk(context.deviceFingerprint),
      behaviorRisk: this.calculateBehaviorAnomaly(user.uid),
      contentRisk: await this.analyzeContentSafety(context.content),
      networkRisk: await this.checkNetworkReputation(context.ipAddress)
    };

    const compositeScore = this.calculateCompositeRisk(riskFactors);
    
    return {
      riskScore: compositeScore,
      actions: this.determineMitigationActions(compositeScore),
      insights: riskFactors
    };
  }

  async analyzeContentSafety(content) {
    const checks = {
      ruleBased: this.checkForbiddenPatterns(content),
      semantic: await this.detectToxicLanguage(content.text || ""),
      contextual: this.analyzeContentContext(content),
      visual: await this.analyzeImages(content.images)
    };

    return {
      isSafe: Object.values(checks).every(check => check.isSafe !== false),
      details: checks
    };
  }

  calculateBehaviorAnomaly(userId) {
    const profile = this.userBehaviorProfiles.get(userId) || { typingSpeed: 0, mouseMovement: 0, navigationPattern: 0 };
    const currentBehavior = this.getCurrentBehaviorMetrics();
    
    return this.threatModels.anomaly.predict([
      profile.typingSpeed,
      profile.mouseMovement,
      profile.navigationPattern,
      currentBehavior
    ]);
  }

  async checkNetworkReputation(ip) {
    try {
      const response = await fetch(`https://api.threatintel.com/check/${ip}`);
      const data = await response.json();
      return {
        isVPN: data.is_vpn,
        torNode: data.is_tor,
        maliciousScore: data.threat_score,
        recentAbuse: data.abuse_confidence > 60
      };
    } catch (err) {
      console.error("Network reputation check failed:", err);
      return { isVPN: false, torNode: false, maliciousScore: 0, recentAbuse: false };
    }
  }

  determineMitigationActions(riskScore) {
    return {
      requireMFA: riskScore > 30,
      temporaryLock: riskScore > 70,
      contentReview: riskScore > 50,
      securityChallenge: riskScore > 40
    };
  }

  async detectToxicLanguage(text) {
    const toxicityModel = await this.threatModels.toxicity;
    const predictions = await toxicityModel.classify(text);
    return { isSafe: !predictions.some(p => p.results[0].match) };
  }

  calculateDeviceRisk(fingerprint) {
    const components = [
      'canvasHash',
      'webglHash',
      'audioContextHash',
      'fontFingerprint'
    ];
    return components.reduce((score, component) => {
      return score + this.calculateComponentRisk(fingerprint[component]);
    }, 0);
  }

  updateBehaviorProfile(userId, interactions) {
    const profile = this.userBehaviorProfiles.get(userId) || this.createNewProfile();
    
      profile.typingSpeed = 0.9 * profile.typingSpeed + 0.1 * interactions.typingSpeed;
    profile.clickPattern = this.analyzeClickClusters(interactions.clicks);
    profile.sessionRhythm = this.detectUsagePatterns(interactions.timestamps);
    
    this.userBehaviorProfiles.set(userId, profile);
  }

  async preventAccountTakeover(user, context) {
    const geoVelocity = this.calculateGeoVelocity(
      user.lastLoginLocation,
      context.location
    );

    if (geoVelocity > 500) {
      this.triggerSecurityChallenge(user);
      return false;
    }
    
    return true;
  }

  calculateCompositeRisk(riskFactors) {
    const { deviceRisk, behaviorRisk, contentRisk, networkRisk } = riskFactors;
    let score = deviceRisk + behaviorRisk;
    score += contentRisk.isSafe ? 0 : 40;
    score += networkRisk.maliciousScore;
    return score;
  }

  calculateComponentRisk(componentValue) {
    return componentValue ? 10 : 0;
  }

  createNewProfile() {
    return {
      typingSpeed: 50,
      mouseMovement: 50,
      navigationPattern: 50
    };
  }

  getCurrentBehaviorMetrics() {
    return 50;
  }

  checkForbiddenPatterns(content) {
    return { isSafe: true };
  }

  analyzeContentContext(content) {
    return { isSafe: true };
  }

  async analyzeImages(images) {
    return { isSafe: true };
  }

  analyzeClickClusters(clicks) {
    return clicks.length;
  }

  detectUsagePatterns(timestamps) {
    return timestamps.length;
  }

  calculateDistance(prev, curr) {
    return 100;
  }

  calculateGeoVelocity(previous, current) {
    const distance = this.calculateDistance(previous, current);
    const timeDiff = (current.timestamp - previous.timestamp) / 3600000;
    return distance / timeDiff;
  }

  triggerSecurityChallenge(user) {
    console.warn("Security challenge triggered for", user.email);
  }

  generateAIChallenge() {
    return "Solve: 2 + 2 = ?";
  }

  requireFaceAuth() {
    return true;
  }

  personalSecurityQuestion() {
    return "What is your pet's name?";
  }

  async handleCriticalThreat(user) {
    console.error("Critical threat detected for", user.email);
  }

  async handleDangerousContent(user, context) {
    console.error("Dangerous content detected for", user.email);
  }

  loadPhishingModel() {
    return { predict: () => 10 };
  }
  loadToxicityModel() {
    return new Promise(resolve => {
      resolve({
        classify: async text => [{ results: [{ match: false }] }]
      });
    });
  }
  loadAnomalyDetectionModel() {
    return { predict: () => 20 };
  }
}

const protectionSystem = new UserProtectionSystem();

const secureFirebaseOperation = async (operation, user, context) => {
  const securityCheck = await protectionSystem.analyzeUserSession(user, context);
  
  if (securityCheck.riskScore > 75) {
    await protectionSystem.handleCriticalThreat(user);
    throw new Error('Operation blocked by security system');
  }

  if (securityCheck.actions.requireMFA) {
    await triggerMultiFactorAuth(user);
  }

  const contentSafety = await protectionSystem.analyzeContentSafety(context.content);
  if (!contentSafety.isSafe) {
    await protectionSystem.handleDangerousContent(user, context);
    throw new Error('Content violates safety policies');
  }

  return operation();
};

async function triggerMultiFactorAuth(user) {
  console.warn("Triggering MFA for", user.email);
}
function getDeviceFingerprint() {
  return {
    canvasHash: "dummy",
    webglHash: "dummy",
    audioContextHash: "dummy",
    fontFingerprint: "dummy"
  };
}
async function getGeoLocation() {
  return { latitude: 0, longitude: 0, timestamp: Date.now() };
}

async function securePostMessage(user, message) {
  return secureFirebaseOperation(
    async () => {
      await firebase.firestore().collection('posts').add(message);
    },
    user,
    {
      content: message,
      deviceFingerprint: getDeviceFingerprint(),
      ipAddress: "127.0.0.1",
      location: await getGeoLocation()
    }
  );
}

document.addEventListener("DOMContentLoaded", function () {
  const CONFIG = {
    FIREBASE: {
      apiKey: "AIzaSyA1kGDOAuQRqdgXHX3Ugjj_zL7_bqYXos0",
      authDomain: "myapp-3a874.firebaseapp.com",
      projectId: "myapp-3a874",
      storageBucket: "myapp-3a874.appspot.com",
      messagingSenderId: "430236087961",
      appId: "1:430236087961:web:d7b0e75c6cf2498c9b6a08"
    },
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    AVATAR_COLORS: ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'],
    ALLOWED_DOMAINS: ["gmail.com", "example.com"],
    FORBIDDEN_WORDS: ["empathy"]
  };

  const state = {
    forumPostsData: [],
    searchQuery: "",
    userPrefs: {
      darkMode: localStorage.getItem('darkMode') === 'true'
    }
  };

  firebase.initializeApp(CONFIG.FIREBASE);
  const firestore = firebase.firestore(),
    auth = firebase.auth(),
    storage = firebase.storage();

  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.zIndex = "9999";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, match => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[match]));
  }

  function escapeAndHighlight(text, query) {
    if (!text) return "";
    if (!query) return escapeHTML(text);
    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map(part => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return `<span class="highlight">${escapeHTML(part)}</span>`;
      }
      return escapeHTML(part);
    }).join("");
  }

  function containsForbiddenContent(text) {
    return CONFIG.FORBIDDEN_WORDS.some(word => text.toLowerCase().includes(word));
  }

  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function parseMentionsAndLinks(text) {
    if (!text) return "";
    return linkify(text).replace(/@([\w.]+)/g, '<span class="mention" data-user="$1">@$1</span>');
  }

  function generateAvatarInitial(name) {
    const colors = CONFIG.AVATAR_COLORS;
    const hash = name ? Array.from(name).reduce((acc, char) => char.charCodeAt(0) + acc, 0) : 0;
    const color = colors[hash % colors.length];
    
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    ctx.fillText(initial, 50, 50);
    return canvas.toDataURL();
  }

  async function logSecurityEvent(eventType, details) {
    try {
      await firestore.collection("securityLogs").add({
        eventType,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging security event:", err);
    }
  }

  async function logActivity(activityType, details) {
    try {
      await firestore.collection("activityLogs").add({
        activityType,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  }

  async function rewardUser(userId, amount) {
    try {
      await firestore.collection("users").doc(userId).set({
        credits: firebase.firestore.FieldValue.increment(amount)
      }, { merge: true });
    } catch (err) {
      console.error("Error rewarding user:", err);
    }
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    document.documentElement.classList.toggle('dark-mode', state.userPrefs.darkMode);
    themeToggle.addEventListener("click", () => {
      state.userPrefs.darkMode = !state.userPrefs.darkMode;
      localStorage.setItem('darkMode', state.userPrefs.darkMode);
      document.documentElement.classList.toggle('dark-mode', state.userPrefs.darkMode);
    });
  }

  const loginModal = document.getElementById("loginModal");
  const loginBtn = document.getElementById("loginBtn"),
    signupBtn = document.getElementById("signupBtn"),
    googleLoginBtn = document.getElementById("googleLoginBtn"),
    loginEmail = document.getElementById("loginEmail"),
    loginPassword = document.getElementById("loginPassword");

  auth.onAuthStateChanged(user => {
    loginModal.style.display = user ? "none" : "flex";
    if (user) {
      const profilePicElem = document.getElementById("profilePic");
      if (profilePicElem) {
        profilePicElem.src =
          user.photoURL ||
          generateAvatarInitial(user.displayName || (user.email ? user.email.split("@")[0] : "Guest"));
      }
    }
  });

  function isValidEmail(email) {
    const allowedDomains = CONFIG.ALLOWED_DOMAINS;
    const emailRegex = /^[a-zA-Z0-9._]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    const match = email.match(emailRegex);
    if (!match) return false;
    const domain = match[1].toLowerCase();
    return allowedDomains.includes(domain);
  }

  loginBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim(),
      password = loginPassword.value.trim();
    if (!isValidEmail(email)) {
      alert("Enter a valid email address from an allowed domain (e.g. gmail.com).");
      return;
    }
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.reload();
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        alert("A verification email has been sent. Please verify your email before logging in.");
        await auth.signOut();
        await logSecurityEvent("email_verification_required", `User ${email} attempted login without verification.`);
      } else {
        loginModal.style.display = "none";
        await logActivity("login", `User ${email} logged in successfully.`);
      }
    } catch (err) {
      alert(`Login Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("login_error", `Error during login for ${email}: ${err.code}`);
    }
  });

  signupBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim(),
      password = loginPassword.value.trim();
    if (!isValidEmail(email)) {
      alert("Enter a valid email address from an allowed domain (e.g. gmail.com).");
      return;
    }
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: email.split("@")[0] });
      await user.sendEmailVerification();
      alert("A verification email has been sent. Please check your inbox and verify your email before logging in.");
      await auth.signOut();
      await logSecurityEvent("signup", `New user signed up: ${email}`);
    } catch (err) {
      alert(`Signup Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("signup_error", `Error during signup for ${email}: ${err.code}`);
    }
  });

  googleLoginBtn.addEventListener("click", async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      loginModal.style.display = "none";
      await logActivity("login", "User logged in with Google.");
    } catch (err) {
      alert(`Google Login Error: ${err.code} - ${err.message}`);
      await logSecurityEvent("google_login_error", `Error during Google login: ${err.code}`);
    }
  });

  document.getElementById("minimizeBtn").addEventListener("click", () => window.windowControls.minimize());
  document.getElementById("maximizeBtn").addEventListener("click", () => window.windowControls.maximize());
  document.getElementById("closeBtn").addEventListener("click", () => window.windowControls.close());
  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("activate");
  });

  const aboutModal = document.getElementById("aboutModal");
  document.getElementById("aboutBtn").addEventListener("click", () => aboutModal.style.display = "flex");
  document.getElementById("closeAboutModal").addEventListener("click", () => aboutModal.style.display = "none");
  aboutModal.addEventListener("click", e => {
    if (e.target === aboutModal) aboutModal.style.display = "none";
  });

  const chatContainer = document.getElementById("chatContainer"),
    forumContainer = document.getElementById("forumContainer"),
    dashboardContainer = document.getElementById("dashboardContainer");

  document.getElementById("chatBtn").addEventListener("click", () => {
    chatContainer.style.display = "flex";
    forumContainer.style.display = "none";
    dashboardContainer.style.display = "none";
  });
  document.getElementById("forumBtn").addEventListener("click", () => {
    forumContainer.style.display = "flex";
    chatContainer.style.display = "none";
    dashboardContainer.style.display = "none";
  });

  const updatesModal = document.getElementById("updatesModal"),
    updatesList = document.getElementById("updatesList"),
    updateIndicator = document.getElementById("updateIndicator");
  let updatesSocket = null;
  function openUpdatesModal() {
    updatesModal.style.display = "flex";
    updateIndicator.style.display = "none";
    if (!updatesSocket) {
      updatesSocket = new WebSocket("wss://echo.websocket.org/updates");
      updatesSocket.onmessage = e => {
        if (e.data.startsWith("Request served by")) return;
        const li = document.createElement("li");
        li.textContent = e.data;
        updatesList.appendChild(li);
        if (updatesModal.style.display !== "flex") {
          updateIndicator.style.display = "block";
        }
      };
      updatesSocket.onerror = err => console.error(err);
      updatesSocket.onclose = () => updatesSocket = null;
    }
  }
  document.getElementById("updatesBtn").addEventListener("click", openUpdatesModal);
  document.getElementById("closeUpdatesModal").addEventListener("click", () => updatesModal.style.display = "none");
  updatesModal.addEventListener("click", e => {
    if (e.target === updatesModal) updatesModal.style.display = "none";
  });

  
  function renderForumPosts(posts) {
    const forumPostsContainer = document.getElementById("forumPosts");
    forumPostsContainer.innerHTML = "";
    posts.forEach(doc => {
      const data = doc.data;
      const currentUser = firebase.auth().currentUser;
      const canDelete = currentUser && currentUser.uid === data.uid;
      const mediaHtml = data.fileUrl ? renderMedia(data.fileUrl, data.fileType) : "";
      
      const postElem = document.createElement("div");
      postElem.className = "forum-post";
      postElem.innerHTML = `
        <strong style="font-size:16px; display:flex; align-items:center; gap:10px;">
          <i class="ri-corner-left-down-line" style="font-size:26px;"></i>
          ${escapeHTML(data.userName) || "Anonymous"}
          <em style="font-size:12px;">(${data.time || "Just now"})</em>
        </strong>
        <p style="font-size:14px; line-height:20px;">
          ${linkify(escapeAndHighlight(data.text, state.searchQuery))}
        </p>
        ${mediaHtml}
      `;
      if (canDelete) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this forum post?")) return;
          try {
            const docRef = firestore.collection("forumPosts").doc(doc.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
              alert("This post no longer exists.");
              return;
            }
            const docData = docSnap.data();
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || currentUser.uid !== docData.uid) {
              alert("You do not have permission to delete this post.");
              await logSecurityEvent("unauthorized_delete", `Unauthorized forum post deletion attempt by ${currentUser ? currentUser.email : "Guest"}.`);
              return;
            }
            await docRef.delete();
          } catch (err) {
            console.error("Error deleting forum post:", err);
            await logSecurityEvent("delete_error", `Error deleting forum post: ${err.message}`);
          }
        });
        postElem.querySelector("strong").appendChild(deleteBtn);
      }
      forumPostsContainer.appendChild(postElem);
    });
  }

  firestore.collection("forumPosts").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      state.forumPostsData = [];
      snapshot.forEach(doc => {
        state.forumPostsData.push({ id: doc.id, data: doc.data() });
      });
      renderForumPosts(state.forumPostsData);
    });

  const forumSearchInput = document.getElementById("forumSearch");
  forumSearchInput.addEventListener("input", debounce(() => {
    state.searchQuery = forumSearchInput.value.trim().toLowerCase();
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      logActivity("forum_search", `User ${currentUser.email} searched for "${state.searchQuery}"`);
    }
    if (state.searchQuery === "") {
      renderForumPosts(state.forumPostsData);
      return;
    }
    const filtered = state.forumPostsData.filter(doc => {
      const data = doc.data;
      return (data.text && data.text.toLowerCase().includes(state.searchQuery)) ||
             (data.userName && data.userName.toLowerCase().includes(state.searchQuery));
    });
    renderForumPosts(filtered);
  }, 300));

  const dashboardUsername = document.getElementById("dashboardUsername"),
    dashboardEmail = document.getElementById("dashboardEmail"),
    dashboardCreditsSpan = document.getElementById("dashboardCredits");

  document.getElementById("dashboardBtn").addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (user) {
      const name = user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous");
      dashboardUsername.textContent = name;
      dashboardEmail.textContent = user.email;
      try {
        const docSnap = await firestore.collection("users").doc(user.uid).get();
        dashboardCreditsSpan.textContent = docSnap.exists ? (docSnap.data().credits || 0) : 0;
      } catch (err) {
        console.error("Error fetching user data:", err);
        await logSecurityEvent("dashboard_error", `Error fetching data for ${user.email}: ${err.message}`);
      }
    }
    chatContainer.style.display = forumContainer.style.display = "none";
    dashboardContainer.style.display = "flex";
  });

  document.getElementById("uploadPicBtn").addEventListener("click", async () => {
    const file = document.getElementById("profilePicInput").files[0],
      user = firebase.auth().currentUser,
      profilePicImg = document.getElementById("profilePic");
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
      await logActivity("update_profile_pic", `User ${user.email} updated profile picture.`);
    } catch (err) {
      alert("Error uploading profile picture.");
      await logSecurityEvent("upload_error", `Error uploading profile picture for ${user.email}: ${err.message}`);
    }
  });

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

  const forumInput = document.getElementById("forumInput"),
    forumSubmit = document.getElementById("forumSubmit");

  forumSubmit.addEventListener("click", async () => {
    const text = forumInput.value.trim(),
      user = firebase.auth().currentUser;
    if (!text) {
      alert("Cannot send an empty post.");
      return;
    }
    if (containsForbiddenContent(text)) {
      alert("Empathy messages are not allowed.");
      await logSecurityEvent("forum_post_blocked", `User ${user ? user.email : "Guest"} attempted to post forbidden content.`);
      return;
    }
    let fileUrl = "", fileType = "";
    try {
      const file = document.getElementById("forumFile").files[0];
      if (file) {
        if(file.size > CONFIG.MAX_FILE_SIZE) {
          alert("File size exceeds 5MB limit.");
          return;
        }
        const fileRef = storage.ref().child(`forum_files/${user.uid}_${file.name}`);
        await fileRef.put(file);
        fileUrl = await fileRef.getDownloadURL();
        fileType = file.type;
      }
      const userName = user
        ? (user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous"))
        : "Anonymous";
      await firestore.collection("forumPosts").add({
        uid: user ? user.uid : null,
        userName,
        text: escapeHTML(text),
        fileUrl,
        fileType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        time: new Date().toLocaleDateString()
      });
      forumInput.value = "";
      document.getElementById("forumFile").value = "";
      if (user) {
        await rewardUser(user.uid, 1);
      }
      await logActivity("forum_post", `User ${user ? user.email : "Guest"} posted in forum.`);
    } catch (err) {
      console.error("Error posting forum message:", err);
      await logSecurityEvent("forum_post_error", `Error posting forum message for ${user ? user.email : "Guest"}: ${err.message}`);
    }
  });

  const chatMessagesDiv = document.getElementById("chatMessages");
  let chatLimit = 20;
  let chatUnsubscribe;

  function renderChatMessages(messages) {
    chatMessagesDiv.innerHTML = "";
    messages.forEach(message => {
      const data = message.data;
      const currentUser = firebase.auth().currentUser;
      const canDelete = currentUser && currentUser.uid === data.uid;
      
      const chatMessageElem = document.createElement("div");
      chatMessageElem.className = "chat-message";
      
      const messageContainer = document.createElement("div");
      messageContainer.style.display = "flex";
      messageContainer.style.flexDirection = "column";
      messageContainer.style.marginBottom = "10px";

      const header = document.createElement("strong");
      header.style.position = "relative";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.left = "30px";
      header.style.top = "17px";
      header.style.width = "90%";
      header.style.transition = "all ease-in 0.2s";
      header.className = "user__name";
      header.textContent = escapeHTML(data.userName) + ":";

      if (canDelete) {
        const deleteIcon = document.createElement("i");
        deleteIcon.className = "ri-delete-bin-7-line";
        deleteIcon.style.cursor = "pointer";
        deleteIcon.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this chat message?")) return;
          try {
            const docRef = firestore.collection("chats").doc(message.id);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
              alert("This message no longer exists.");
              return;
            }
            const docData = docSnap.data();
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || currentUser.uid !== docData.uid) {
              alert("You do not have permission to delete this message.");
              await logSecurityEvent("unauthorized_delete", `Unauthorized chat message deletion attempt by ${currentUser ? currentUser.email : "Guest"}.`);
              return;
            }
            await docRef.delete();
          } catch (err) {
            console.error("Error deleting chat message:", err);
            await logSecurityEvent("delete_error", `Error deleting chat message: ${err.message}`);
          }
        });
        header.appendChild(deleteIcon);
      }

      messageContainer.appendChild(header);

      const iconElem = document.createElement("i");
      iconElem.className = "ri-corner-left-down-line";
      iconElem.style.fontSize = "26px";
      messageContainer.appendChild(iconElem);

      const contentContainer = document.createElement("div");
      contentContainer.style.width = "100%";
      contentContainer.style.display = "flex";
      contentContainer.style.alignItems = "center";
      contentContainer.style.gap = "10px";

      const profileImg = document.createElement("img");
      profileImg.style.width = "40px";
      profileImg.style.height = "40px";
      profileImg.style.borderRadius = "50%";
      profileImg.style.marginRight = "5px";
      profileImg.src = data.photoURL || generateAvatarInitial(data.userName);

      contentContainer.appendChild(profileImg);

      const messageText = document.createElement("span");
      messageText.style.fontSize = "17px";
      messageText.innerHTML = parseMentionsAndLinks(data.text);
      contentContainer.appendChild(messageText);

      messageContainer.appendChild(contentContainer);

      if (data.fileUrl) {
        const mediaContainer = document.createElement("div");
        mediaContainer.innerHTML = renderMedia(data.fileUrl, data.fileType);
        messageContainer.appendChild(mediaContainer);
      }

      chatMessageElem.appendChild(messageContainer);
      chatMessagesDiv.appendChild(chatMessageElem);
    });

    if (chatLimit === 20) {
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
  }

  function loadChatMessages() {
    if (chatUnsubscribe) chatUnsubscribe();
    const chatQuery = firestore
      .collection("chats")
      .orderBy("timestamp", "desc")
      .limit(chatLimit);
    chatUnsubscribe = chatQuery.onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, data: doc.data() });
      });
      messages.reverse();
      renderChatMessages(messages);
    });
  }

  loadChatMessages();

  chatMessagesDiv.addEventListener("scroll", function () {
    if (chatMessagesDiv.scrollTop === 0) {
      chatLimit += 20;
      loadChatMessages();
    }
  });

  const chatInput = document.getElementById("chatInput"),
    chatSendBtn = document.getElementById("chatSendBtn"),
    typingLoader = document.getElementById("typingLoader"),
    typingStatusCollection = firestore.collection("typingStatus");
  let typingTimeout;

  chatInput.addEventListener("input", () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const userDoc = typingStatusCollection.doc(user.uid);
    if (chatInput.value.trim() !== "") {
      userDoc.set({
        typing: true,
        userName: user.displayName || (user.email ? user.email.split("@")[0] : "Anonymous")
      });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        userDoc.set({ typing: false });
      }, 3000);
    } else {
      userDoc.set({ typing: false });
    }
  });

  chatInput.addEventListener("keydown", function (e) {
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

  document.getElementById("emojiToggle").addEventListener("click", () => {
    const emojiPicker = document.getElementById("emojiPicker"),
      stickerPicker = document.getElementById("stickerPicker");
    emojiPicker.style.display = (emojiPicker.style.display === "block") ? "none" : "block";
    stickerPicker.style.display = "none";
  });

  document.getElementById("stickerToggle").addEventListener("click", async () => {
    const stickerPicker = document.getElementById("stickerPicker");
    if (stickerPicker.style.display === "block") {
      stickerPicker.style.display = "none";
      return;
    }
    if (!stickerPicker.innerHTML.trim()) {
      const apiKey = "1FQEo2nvaarypzmTvT0RY5leH7w33EXA",
        url = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=100&rating=g`;
      try {
        const result = await (await fetch(url)).json();
        if (result.data) {
          result.data.forEach(sticker => {
            const img = document.createElement("img");
            img.src = sticker.images.fixed_width.url;
            img.dataset.sticker = sticker.images.fixed_width.url;
            stickerPicker.appendChild(img);
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    stickerPicker.style.display = "block";
    document.getElementById("emojiPicker").style.display = "none";
  });

  document.querySelectorAll("#emojiPicker span").forEach(emoji => {
    emoji.addEventListener("click", () => {
      chatInput.value += emoji.textContent;
    });
  });

  document.getElementById("stickerPicker").addEventListener("click", async (e) => {
    if (e.target.tagName.toLowerCase() === "img") {
      const stickerUrl = e.target.dataset.sticker,
        user = firebase.auth().currentUser,
        userName = user ? (user.displayName || (user.email ? user.email.split("@")[0] : "Guest")) : "Guest",
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
        document.getElementById("stickerPicker").style.display = "none";
        if (user) {
          await rewardUser(user.uid, 1);
          await logActivity("sticker_post", `User ${user.email} posted a sticker.`);
        }
      } catch (err) {
        console.error(err);
        await logSecurityEvent("sticker_post_error", `Error posting sticker for ${user ? user.email : "Guest"}: ${err.message}`);
      }
    }
  });

  chatSendBtn.addEventListener("click", async () => {
    const messageText = chatInput.value.trim(),
      user = firebase.auth().currentUser,
      userName = user ? (user.displayName || (user.email ? user.email.split("@")[0] : "Guest")) : "Guest",
      photoURL = user ? user.photoURL || "" : "";
    if (!messageText) {
      alert("Cannot send an empty message.");
      return;
    }
    if (containsForbiddenContent(messageText)) {
      alert("Empathy messages are not allowed.");
      await logSecurityEvent("chat_message_blocked", `User ${user ? user.email : "Guest"} attempted to send forbidden content.`);
      return;
    }
    let fileUrl = "", fileType = "";
    try {
      const file = document.getElementById("chatFile").files[0];
      if (file) {
        const fileRef = storage.ref().child(`chat_files/${user.uid}_${file.name}`);
        await fileRef.put(file);
        fileUrl = await fileRef.getDownloadURL();
        fileType = file.type;
      }
      await firestore.collection("chats").add({
        uid: user ? user.uid : null,
        userName,
        text: messageText,
        photoURL,
        fileUrl,
        fileType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      chatInput.value = "";
      document.getElementById("chatFile").value = "";
      if (user) {
        await rewardUser(user.uid, 1);
        await logActivity("chat_post", `User ${user.email} sent a chat message.`);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      await logSecurityEvent("chat_send_error", `Error sending chat message for ${user ? user.email : "Guest"}: ${err.message}`);
    }
  });
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("mention")) {
    const mentionedUser = e.target.getAttribute("data-user");
    alert(`You clicked on mention: @${mentionedUser}`);
  }
});

function openImageOverlay(imageUrl) {
  let overlay = document.getElementById("imgOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "imgOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";
    overlay.style.cursor = "pointer";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", () => {
      overlay.style.display = "none";
    });
  }
  overlay.innerHTML = `<img src="${imageUrl}" style="max-width:90%; max-height:90%;">`;
  overlay.style.display = "flex";
}

document.addEventListener("click", function (e) {
  const target = e.target.closest(".img-overlay-link");
  if (target) {
    e.preventDefault();
    const imageUrl = target.dataset.image ? decodeURIComponent(target.dataset.image) : "";
    if (imageUrl) {
      openImageOverlay(imageUrl);
    }
  }
});
