// VoIP Service Integration for CallConsole
// Designed to work with Twilio, Agora, or other VoIP providers

export interface VoIPCall {
  id: string;
  status: 'idle' | 'dialing' | 'ringing' | 'active' | 'hold' | 'muted' | 'ended';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  recordingUrl?: string;
  transcription?: string[];
}

export interface VoIPConfig {
  provider: 'twilio' | 'agora' | 'webrtc' | 'mock';
  accountSid?: string;
  authToken?: string;
  applicationSid?: string;
  phoneNumber?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface CallControls {
  mute: () => Promise<boolean>;
  unmute: () => Promise<boolean>;
  hold: () => Promise<boolean>;
  unhold: () => Promise<boolean>;
  transfer: (targetNumber: string) => Promise<boolean>;
  record: () => Promise<boolean>;
  stopRecording: () => Promise<string>; // returns recording URL
  hangup: () => Promise<boolean>;
}

export interface VoIPService {
  // Core call management
  makeCall: (to: string, from?: string) => Promise<VoIPCall>;
  answerCall: (callId: string) => Promise<VoIPCall>;
  hangupCall: (callId: string) => Promise<boolean>;
  
  // Call controls
  getCallControls: (callId: string) => CallControls;
  
  // Recording & transcription
  startRecording: (callId: string) => Promise<boolean>;
  stopRecording: (callId: string) => Promise<string>;
  getTranscription: (callId: string) => Promise<string[]>;
  
  // Event handling
  onCallStatusChange: (callback: (call: VoIPCall) => void) => void;
  onRecordingUpdate: (callback: (callId: string, isRecording: boolean) => void) => void;
  onTranscriptionUpdate: (callback: (callId: string, text: string) => void) => void;
  
  // Cleanup
  dispose: () => void;
}

// Mock VoIP Service for development/testing
export class MockVoIPService implements VoIPService {
  private config: VoIPConfig;
  private currentCall: VoIPCall | null = null;
  private callControls: CallControls | null = null;
  private statusCallbacks: ((call: VoIPCall) => void)[] = [];
  private recordingCallbacks: ((callId: string, isRecording: boolean) => void)[] = [];
  private transcriptionCallbacks: ((callId: string, text: string) => void)[] = [];
  private recordingInterval: NodeJS.Timeout | null = null;
  private transcriptionInterval: NodeJS.Timeout | null = null;

  constructor(config: VoIPConfig) {
    this.config = config;
  }

  async makeCall(to: string, from?: string): Promise<VoIPCall> {
    const callId = `call_${Date.now()}`;
    const call: VoIPCall = {
      id: callId,
      status: 'dialing',
      direction: 'outbound',
      from: from || this.config.phoneNumber || '+1234567890',
      to,
      startTime: new Date(),
      duration: 0
    };

    this.currentCall = call;
    this.notifyStatusChange(call);

    // Simulate dialing sequence
    setTimeout(() => {
      if (this.currentCall?.id === callId) {
        call.status = 'ringing';
        this.notifyStatusChange(call);
      }
    }, 1000);

    setTimeout(() => {
      if (this.currentCall?.id === callId) {
        call.status = 'active';
        this.notifyStatusChange(call);
        this.startDurationTimer(callId);
      }
    }, 3000);

    return call;
  }

  async answerCall(callId: string): Promise<VoIPCall> {
    if (this.currentCall?.id === callId) {
      this.currentCall.status = 'active';
      this.notifyStatusChange(this.currentCall);
      this.startDurationTimer(callId);
    }
    return this.currentCall!;
  }

  async hangupCall(callId: string): Promise<boolean> {
    if (this.currentCall?.id === callId) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      this.notifyStatusChange(this.currentCall);
      this.stopDurationTimer();
      this.currentCall = null;
      this.callControls = null;
      return true;
    }
    return false;
  }

  getCallControls(callId: string): CallControls {
    if (this.currentCall?.id !== callId) {
      throw new Error('Call not found');
    }

    if (!this.callControls) {
      this.callControls = {
        mute: async () => {
          if (this.currentCall?.status === 'active') {
            this.currentCall.status = 'muted';
            this.notifyStatusChange(this.currentCall);
            return true;
          }
          return false;
        },
        
        unmute: async () => {
          if (this.currentCall?.status === 'muted') {
            this.currentCall.status = 'active';
            this.notifyStatusChange(this.currentCall);
            return true;
          }
          return false;
        },
        
        hold: async () => {
          if (this.currentCall?.status === 'active' || this.currentCall?.status === 'muted') {
            this.currentCall.status = 'hold';
            this.notifyStatusChange(this.currentCall);
            return true;
          }
          return false;
        },
        
        unhold: async () => {
          if (this.currentCall?.status === 'hold') {
            this.currentCall.status = 'active';
            this.notifyStatusChange(this.currentCall);
            return true;
          }
          return false;
        },
        
        transfer: async (targetNumber: string) => {
          // Mock transfer - in real implementation, this would transfer the call
          console.log(`Transferring call to ${targetNumber}`);
          return true;
        },
        
        record: async () => {
          this.startMockRecording(callId);
          return true;
        },
        
        stopRecording: async () => {
          const recordingUrl = this.stopMockRecording(callId);
          return recordingUrl;
        },
        
        hangup: async () => {
          return this.hangupCall(callId);
        }
      };
    }

    return this.callControls;
  }

  async startRecording(callId: string): Promise<boolean> {
    this.startMockRecording(callId);
    return true;
  }

  async stopRecording(callId: string): Promise<string> {
    return this.stopMockRecording(callId);
  }

  async getTranscription(callId: string): Promise<string[]> {
    return this.currentCall?.transcription || [];
  }

  onCallStatusChange(callback: (call: VoIPCall) => void): void {
    this.statusCallbacks.push(callback);
  }

  onRecordingUpdate(callback: (callId: string, isRecording: boolean) => void): void {
    this.recordingCallbacks.push(callback);
  }

  onTranscriptionUpdate(callback: (callId: string, text: string) => void): void {
    this.transcriptionCallbacks.push(callback);
  }

  dispose(): void {
    this.stopDurationTimer();
    if (this.recordingInterval) clearInterval(this.recordingInterval);
    if (this.transcriptionInterval) clearInterval(this.transcriptionInterval);
    this.statusCallbacks = [];
    this.recordingCallbacks = [];
    this.transcriptionCallbacks = [];
  }

  private notifyStatusChange(call: VoIPCall): void {
    this.statusCallbacks.forEach(callback => callback(call));
  }

  private startDurationTimer(callId: string): void {
    // Update duration every second
    const timer = setInterval(() => {
      if (this.currentCall?.id === callId && this.currentCall.status === 'active') {
        this.currentCall.duration += 1;
        this.notifyStatusChange(this.currentCall);
      }
    }, 1000);
  }

  private stopDurationTimer(): void {
    // Timer cleanup handled by VoIP service lifecycle
  }

  private startMockRecording(callId: string): void {
    this.recordingCallbacks.forEach(callback => callback(callId, true));
    
    // Simulate transcription updates
    this.transcriptionInterval = setInterval(() => {
      const mockTranscriptions = [
        "Hello, thank you for calling Bridge University. How can I help you today?",
        "I've been thinking about studying music production and I was wondering if you could tell me more about your courses.",
        "I'm particularly interested in the practical side of things - what kind of equipment and software do students get to use?",
        "That sounds really comprehensive. What kind of career opportunities do graduates typically find?",
        "I'm a bit worried about the entry requirements - I don't have traditional A-levels but I've been working in a recording studio for two years.",
        "That's really helpful to know. What's the application process like and when would I need to apply by?",
        "The course fees are something I'm concerned about - is there any financial support available for mature students?",
        "That's brilliant, thank you so much for your time. I think I'd like to go ahead and apply."
      ];
      
      const randomText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      this.transcriptionCallbacks.forEach(callback => callback(callId, randomText));
    }, 5000);
  }

  private stopMockRecording(callId: string): string {
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }
    
    this.recordingCallbacks.forEach(callback => callback(callId, false));
    return `https://api.example.com/recordings/${callId}.mp3`;
  }
}

// Twilio VoIP Service Implementation
export class TwilioVoIPService implements VoIPService {
  private config: VoIPConfig;
  private device: any; // Twilio Device
  private currentCall: VoIPCall | null = null;
  private statusCallbacks: ((call: VoIPCall) => void)[] = [];
  private recordingCallbacks: ((callId: string, isRecording: boolean) => void)[] = [];
  private transcriptionCallbacks: ((callId: string, text: string) => void)[] = [];

  constructor(config: VoIPConfig) {
    this.config = config;
    this.initializeTwilio();
  }

  private async initializeTwilio(): Promise<void> {
    // In a real implementation, you would:
    // 1. Load Twilio JS SDK
    // 2. Initialize device with credentials
    // 3. Set up event listeners
    console.log('Initializing Twilio VoIP service...');
  }

  async makeCall(to: string, from?: string): Promise<VoIPCall> {
    const callId = `call_${Date.now()}`;
    const call: VoIPCall = {
      id: callId,
      status: 'dialing',
      direction: 'outbound',
      from: from || this.config.phoneNumber || '',
      to,
      startTime: new Date(),
      duration: 0
    };

    // In real implementation:
    // this.device.connect({ To: to });
    
    this.currentCall = call;
    this.notifyStatusChange(call);
    return call;
  }

  async answerCall(callId: string): Promise<VoIPCall> {
    // In real implementation:
    // this.device.answer();
    
    if (this.currentCall?.id === callId) {
      this.currentCall.status = 'active';
      this.notifyStatusChange(this.currentCall);
    }
    return this.currentCall!;
  }

  async hangupCall(callId: string): Promise<boolean> {
    // In real implementation:
    // this.device.disconnectAll();
    
    if (this.currentCall?.id === callId) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      this.notifyStatusChange(this.currentCall);
      this.currentCall = null;
      return true;
    }
    return false;
  }

  getCallControls(callId: string): CallControls {
    // Return Twilio-specific controls
    return {
      mute: async () => {
        // this.device.mute(true);
        return true;
      },
      unmute: async () => {
        // this.device.mute(false);
        return true;
      },
      hold: async () => {
        // this.device.hold(true);
        return true;
      },
      unhold: async () => {
        // this.device.hold(false);
        return true;
      },
      transfer: async (targetNumber: string) => {
        // this.device.transfer(targetNumber);
        return true;
      },
      record: async () => {
        // Start Twilio recording
        return true;
      },
      stopRecording: async () => {
        // Stop Twilio recording and return URL
        return `https://api.twilio.com/recordings/${callId}.mp3`;
      },
      hangup: async () => {
        return this.hangupCall(callId);
      }
    };
  }

  async startRecording(callId: string): Promise<boolean> {
    // Twilio recording implementation
    return true;
  }

  async stopRecording(callId: string): Promise<string> {
    // Stop and return recording URL
    return `https://api.twilio.com/recordings/${callId}.mp3`;
  }

  async getTranscription(callId: string): Promise<string[]> {
    // Fetch Twilio transcription
    return [];
  }

  onCallStatusChange(callback: (call: VoIPCall) => void): void {
    this.statusCallbacks.push(callback);
  }

  onRecordingUpdate(callback: (callId: string, isRecording: boolean) => void): void {
    this.recordingCallbacks.push(callback);
  }

  onTranscriptionUpdate(callback: (callId: string, text: string) => void): void {
    this.transcriptionCallbacks.push(callback);
  }

  dispose(): void {
    // Cleanup Twilio device
    this.statusCallbacks = [];
    this.recordingCallbacks = [];
    this.transcriptionCallbacks = [];
  }
}

// Factory function to create VoIP service
export function createVoIPService(config: VoIPConfig): VoIPService {
  switch (config.provider) {
    case 'twilio':
      return new TwilioVoIPService(config);
    case 'mock':
    default:
      return new MockVoIPService(config);
  }
}

// Default configuration
export const defaultVoIPConfig: VoIPConfig = {
  provider: 'mock', // Change to 'twilio' for production
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
  applicationSid: import.meta.env.VITE_TWILIO_APPLICATION_SID,
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER
};
