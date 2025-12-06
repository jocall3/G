interface BiometricData {
  type: 'face' | 'fingerprint' | 'voice' | 'iris';
  /**
   * Base64 encoded biometric data (e.g., image, audio, fingerprint template).
   * For liveness, this might be a single frame or a short video segment.
   */
  data: string;
  /**
   * Optional metadata, e.g., device ID, timestamp, client-side liveness indicators.
   */
  metadata?: Record<string, any>;
}

interface LivenessDetectionResult {
  isLive: boolean;
  /** Confidence score for liveness, typically 0-100. */
  confidence: number;
  /** Optional details about the liveness check, e.g., "spoofing detected". */
  details?: string;
}

interface IdentityVerificationResult {
  isMatch: boolean;
  /** Confidence score for identity match, typically 0-100. */
  confidence: number;
  /** The ID of the user whose template was matched, if successful. */
  userId?: string;
  /** Optional details about the identity check, e.g., "no match found". */
  details?: string;
}

interface BiometricVerificationResponse {
  success: boolean;
  message: string;
  liveness?: LivenessDetectionResult;
  identity?: IdentityVerificationResult;
  /** Error code or message if the overall process failed. */
  error?: string;
}

/**
 * Abstract interface for a Biometric Service Provider.
 * In a real production environment, this would be implemented by an adapter
 * for a specific third-party biometric API (e.g., AWS Rekognition, Azure Face API,
 * Google Cloud Vision AI, or a specialized vendor).
 */
interface IBiometricServiceProvider {
  /**
   * Performs liveness detection on the provided biometric data.
   * @param data The biometric data (e.g., a video frame or image) to analyze for liveness.
   * @returns A promise resolving to the liveness detection result.
   */
  performLivenessDetection(data: BiometricData): Promise<LivenessDetectionResult>;

  /**
   * Verifies the identity of the user against a known biometric template.
   * @param data The biometric data to verify.
   * @param userId The ID of the user whose template to match against.
   * @returns A promise resolving to the identity verification result.
   */
  verifyIdentity(data: BiometricData, userId: string): Promise<IdentityVerificationResult>;

  /**
   * Registers a new biometric template for a user. This is typically done during onboarding.
   * @param data The biometric data to register.
   * @param userId The ID of the user to register the template for.
   * @returns A promise resolving to true if registration was successful.
   */
  registerBiometricTemplate(data: BiometricData, userId: string): Promise<boolean>;
}

/**
 * Mock implementation of the Biometric Service Provider for development and testing.
 * In a production environment, this should be replaced with a real integration.
 */
class MockBiometricServiceProvider implements IBiometricServiceProvider {
  // A simple in-memory store for registered templates.
  // In a real system, this would be persisted in a secure database.
  private registeredTemplates: Map<string, BiometricData> = new Map();

  async performLivenessDetection(data: BiometricData): Promise<LivenessDetectionResult> {
    console.log(`[MockBiometricServiceProvider] Simulating liveness detection for type: ${data.type}`);
    // Simulate a successful liveness detection for most cases
    const isLive = Math.random() > 0.05; // 95% chance of being live
    return {
      isLive: isLive,
      confidence: isLive ? 98 : 15,
      details: isLive ? 'Simulated liveness detected successfully' : 'Simulated spoofing detected',
    };
  }

  async verifyIdentity(data: BiometricData, userId: string): Promise<IdentityVerificationResult> {
    console.log(`[MockBiometricServiceProvider] Simulating identity verification for user: ${userId}, type: ${data.type}`);
    const registeredTemplate = this.registeredTemplates.get(userId);

    if (!registeredTemplate) {
      return {
        isMatch: false,
        confidence: 0,
        details: 'No biometric template registered for this user.',
      };
    }

    // Simulate a match if the data type is the same and some basic data presence
    // In a real system, this would involve complex feature comparison.
    const isMatch = registeredTemplate.type === data.type && registeredTemplate.data === data.data;
    return {
      isMatch: isMatch,
      confidence: isMatch ? 95 : 10,
      userId: isMatch ? userId : undefined,
      details: isMatch ? 'Simulated identity match' : 'Simulated identity mismatch',
    };
  }

  async registerBiometricTemplate(data: BiometricData, userId: string): Promise<boolean> {
    console.log(`[MockBiometricServiceProvider] Registering biometric template for user: ${userId}, type: ${data.type}`);
    if (!data || !data.data) {
      console.error(`[MockBiometricServiceProvider] Invalid data for registration for user ${userId}`);
      return false;
    }
    this.registeredTemplates.set(userId, data);
    return true;
  }
}

/**
 * Service for orchestrating biometric authentication, verifying the living presence
 * of the sovereign for critical actions within the AI banking system.
 * This service combines liveness detection and identity verification.
 */
export class BiometricAuthService {
  private biometricServiceProvider: IBiometricServiceProvider;

  /**
   * Initializes the BiometricAuthService.
   * @param biometricServiceProvider An instance of a biometric service provider.
   *                                 Defaults to MockBiometricServiceProvider for development.
   *                                 **IMPORTANT: Replace with a production-ready provider in production.**
   */
  constructor(biometricServiceProvider: IBiometricServiceProvider = new MockBiometricServiceProvider()) {
    this.biometricServiceProvider = biometricServiceProvider;
  }

  /**
   * Verifies the living presence and identity of the "sovereign" (privileged user)
   * before allowing critical actions. This involves two main steps:
   * 1. Liveness Detection: Ensures the biometric data is from a living person, not a spoof.
   * 2. Identity Verification: Matches the live biometric data against the registered template
   *    of the specified sovereign user.
   *
   * @param biometricData The biometric data provided by the client (e.g., a selfie video frame, fingerprint scan).
   * @param sovereignUserId The ID of the user (the "sovereign") who is attempting the critical action.
   * @returns A promise resolving to the overall biometric verification response.
   */
  public async verifySovereignPresence(
    biometricData: BiometricData,
    sovereignUserId: string
  ): Promise<BiometricVerificationResponse> {
    if (!biometricData || !biometricData.data || !biometricData.type) {
      return {
        success: false,
        message: 'Invalid or incomplete biometric data provided.',
        error: 'INVALID_BIOMETRIC_DATA',
      };
    }
    if (!sovereignUserId) {
      return {
        success: false,
        message: 'Sovereign user ID is required for verification.',
        error: 'MISSING_USER_ID',
      };
    }

    try {
      // Step 1: Perform Liveness Detection
      const livenessResult = await this.biometricServiceProvider.performLivenessDetection(biometricData);

      if (!livenessResult.isLive) {
        return {
          success: false,
          message: 'Liveness detection failed. Possible spoofing attempt detected.',
          liveness: livenessResult,
          error: 'LIVENESS_FAILED',
        };
      }

      // Step 2: Verify Identity against the sovereign's registered template
      const identityResult = await this.biometricServiceProvider.verifyIdentity(biometricData, sovereignUserId);

      if (!identityResult.isMatch || identityResult.userId !== sovereignUserId) {
        return {
          success: false,
          message: 'Identity verification failed. Biometric data does not match the sovereign.',
          liveness: livenessResult,
          identity: identityResult,
          error: 'IDENTITY_MISMATCH',
        };
      }

      // If both liveness and identity are successful
      return {
        success: true,
        message: 'Sovereign presence and identity verified successfully for critical action.',
        liveness: livenessResult,
        identity: identityResult,
      };
    } catch (error: any) {
      console.error(`[BiometricAuthService] Error during sovereign presence verification: ${error.message}`, error);
      return {
        success: false,
        message: 'An unexpected error occurred during biometric verification.',
        error: error.message || 'UNKNOWN_VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Registers biometric data for a user. This is a prerequisite for identity verification.
   * This function would typically be called during user onboarding or profile setup.
   *
   * @param biometricData The biometric data to register (e.g., a clear image of the face).
   * @param userId The ID of the user for whom to register the biometric data.
   * @returns A promise resolving to true if registration was successful, false otherwise.
   */
  public async registerBiometricForUser(biometricData: BiometricData, userId: string): Promise<boolean> {
    if (!biometricData || !biometricData.data || !biometricData.type) {
      console.error('[BiometricAuthService] Attempted to register invalid or incomplete biometric data.');
      return false;
    }
    if (!userId) {
      console.error('[BiometricAuthService] User ID is required for biometric registration.');
      return false;
    }

    try {
      // In a real system, you might also perform an initial liveness check here
      // to ensure the registered template is from a live person.
      const registrationSuccess = await this.biometricServiceProvider.registerBiometricTemplate(biometricData, userId);
      if (registrationSuccess) {
        console.log(`[BiometricAuthService] Biometric data successfully registered for user: ${userId}`);
      } else {
        console.warn(`[BiometricAuthService] Failed to register biometric data for user: ${userId}`);
      }
      return registrationSuccess;
    } catch (error: any) {
      console.error(`[BiometricAuthService] Error registering biometric data for user ${userId}: ${error.message}`, error);
      return false;
    }
  }
}