export class LocalRTC {
  constructor({ signalUrl, onMessage, onPeer } = {}) {
    this.signalUrl = (signalUrl || "http://localhost:8081").replace(/\/$/, "");
    this.onMessage = onMessage || (() => {});
    this.onPeer = onPeer || (() => {});

    this.role = null;
    this.room = null;
    this.peerId = crypto.randomUUID();

    this.hostPCs = new Map();
    this.channels = new Map();
    this.guestPC = null;
    this.polling = false;
  }

  async host() {
    const res = await fetch(`${this.signalUrl}/create`, { method: "POST" });
    const json = await res.json();
    this.room = json.room;
    this.role = "host";
    this.startPolling();
    return this.room;
  }

  async join(room) {
    this.room = room;
    this.role = "guest";

    this.guestPC = this.newPeerConnection();

    this.guestPC.ondatachannel = (event) => {
      this.bindChannel(event.channel, "host");
    };

    const channel = this.guestPC.createDataChannel("game");
    this.bindChannel(channel, "host");

    const offer = await this.guestPC.createOffer();
    await this.guestPC.setLocalDescription(offer);

    await this.signal("host", {
      type: "offer",
      sdp: offer,
      peerId: this.peerId
    });

    this.startPolling();
  }

  newPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      const to = this.role === "host" ? "guest" : "host";
      this.signal(to, {
        type: "ice",
        candidate: event.candidate,
        peerId: this.peerId
      }).catch(() => {});
    };

    return pc;
  }

  bindChannel(channel, peerId) {
    this.channels.set(peerId, channel);

    channel.onopen = () => this.onPeer(peerId);
    channel.onmessage = (event) => this.onMessage(event.data, peerId);
  }

  async signal(to, payload) {
    await fetch(
      `${this.signalUrl}/send?room=${encodeURIComponent(this.room)}&to=${to}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
  }

  startPolling() {
    if (this.polling) return;
    this.polling = true;

    const loop = async () => {
      while (this.polling) {
        try {
          const res = await fetch(
            `${this.signalUrl}/poll?room=${encodeURIComponent(this.room)}&role=${this.role}`
          );
          const messages = await res.json();

          for (const message of messages) {
            await this.handleSignal(message);
          }
        } catch (_) {}

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    loop();
  }

  async handleSignal(message) {
    if (this.role === "host") {
      if (message.type === "offer") {
        const peerId = message.peerId;
        const pc = this.newPeerConnection();
        this.hostPCs.set(peerId, pc);

        pc.ondatachannel = (event) => {
          this.bindChannel(event.channel, peerId);
        };

        await pc.setRemoteDescription(message.sdp);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.signal("guest", {
          type: "answer",
          sdp: answer,
          peerId
        });
      }

      if (message.type === "ice") {
        const pc = this.hostPCs.get(message.peerId);
        if (pc) await pc.addIceCandidate(message.candidate);
      }

      return;
    }

    if (message.peerId !== this.peerId) return;

    if (message.type === "answer") {
      await this.guestPC.setRemoteDescription(message.sdp);
    }

    if (message.type === "ice") {
      await this.guestPC.addIceCandidate(message.candidate);
    }
  }

  send(data, peerId = null) {
    for (const [id, channel] of this.channels) {
      if (channel.readyState !== "open") continue;
      if (peerId && id !== peerId) continue;
      channel.send(data);
    }
  }

  stop() {
    this.polling = false;

    for (const channel of this.channels.values()) {
      try { channel.close(); } catch (_) {}
    }
    for (const pc of this.hostPCs.values()) {
      try { pc.close(); } catch (_) {}
    }
    if (this.guestPC) {
      try { this.guestPC.close(); } catch (_) {}
    }

    this.channels.clear();
    this.hostPCs.clear();
    this.guestPC = null;
  }
}
