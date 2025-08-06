import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from './cache.service';
import { getNotificationService } from './notification.service';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import * as crypto from 'crypto';

export interface BlockchainConfig {
  network: 'ethereum' | 'polygon' | 'bsc' | 'hyperledger';
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
  gasLimit: number;
  gasPrice?: string;
  confirmations: number;
}

export interface DigitalPass {
  id: string;
  studentId: string;
  issuerAddress: string;
  tokenId: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: any;
    }>;
  };
  issuedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'revoked' | 'expired';
}

export interface VerificationResult {
  isValid: boolean;
  pass?: DigitalPass;
  blockchainTx?: string;
  verifiedAt: Date;
  errors?: string[];
}

// ERC-721 Contract ABI for Student Passes
const STUDENT_PASS_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "string", "name": "uri", "type": "string"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "verify",
    "outputs": [
      {"internalType": "bool", "name": "isValid", "type": "bool"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "string", "name": "uri", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export class BlockchainService {
  private cacheService = getCacheService();
  private notificationService = getNotificationService();
  private web3Instances: Map<string, Web3> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private configs: Map<string, BlockchainConfig> = new Map();

  /**
   * Initialize blockchain configuration for a tenant
   */
  async initializeTenant(tenantId: string, config: BlockchainConfig): Promise<void> {
    try {
      // Initialize Web3 instance
      const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl));
      
      // Add account for signing transactions
      const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
      web3.eth.accounts.wallet.add(account);
      web3.eth.defaultAccount = account.address;

      // Initialize contract
      const contract = new web3.eth.Contract(STUDENT_PASS_ABI, config.contractAddress);

      // Store instances
      this.web3Instances.set(tenantId, web3);
      this.contracts.set(tenantId, contract);
      this.configs.set(tenantId, config);

      logger.info(`Blockchain initialized for tenant ${tenantId} on ${config.network}`);

    } catch (error) {
      logger.error(`Failed to initialize blockchain for tenant ${tenantId}:`, error);
      throw new AppError('Blockchain initialization failed', 500);
    }
  }

  /**
   * Issue a digital pass as an NFT
   */
  async issueDigitalPass(
    tenantId: string,
    pass: any,
    studentWalletAddress: string,
    db: PrismaClient
  ): Promise<DigitalPass> {
    try {
      const web3 = this.web3Instances.get(tenantId);
      const contract = this.contracts.get(tenantId);
      const config = this.configs.get(tenantId);

      if (!web3 || !contract || !config) {
        throw new AppError('Blockchain not configured for tenant', 404);
      }

      // Generate token ID
      const tokenId = this.generateTokenId(pass.id);

      // Create metadata
      const metadata = {
        name: `Student Pass #${pass.passNumber}`,
        description: `Digital student pass for ${pass.student.firstName} ${pass.student.lastName}`,
        image: `https://${process.env.CDN_URL}/passes/${pass.id}/image`,
        attributes: [
          { trait_type: 'Student ID', value: pass.student.studentId },
          { trait_type: 'Pass Number', value: pass.passNumber },
          { trait_type: 'Issue Date', value: pass.issueDate.toISOString() },
          { trait_type: 'Expiry Date', value: pass.expiryDate.toISOString() },
          { trait_type: 'School', value: pass.student.school.name },
          { trait_type: 'Pass Type', value: pass.passType }
        ]
      };

      // Upload metadata to IPFS or decentralized storage
      const metadataUri = await this.uploadMetadata(metadata);

      // Mint NFT
      const mintTx = await contract.methods.mint(
        studentWalletAddress,
        tokenId,
        metadataUri
      ).send({
        from: web3.eth.defaultAccount,
        gas: config.gasLimit,
        gasPrice: config.gasPrice || await web3.eth.getGasPrice()
      });

      // Record blockchain transaction
      await db.blockchainRecord.create({
        data: {
          tenantId,
          recordType: 'pass_issue',
          entityId: pass.id,
          blockchainTxHash: mintTx.transactionHash,
          blockchainNetwork: config.network,
          contractAddress: config.contractAddress,
          metadata: {
            tokenId: tokenId.toString(),
            studentWalletAddress,
            metadataUri
          },
          status: 'confirmed'
        }
      });

      const digitalPass: DigitalPass = {
        id: pass.id,
        studentId: pass.studentId,
        issuerAddress: web3.eth.defaultAccount!,
        tokenId: tokenId.toString(),
        metadata,
        issuedAt: new Date(),
        expiresAt: pass.expiryDate,
        status: 'active'
      };

      logger.info(`Digital pass issued: ${pass.passNumber} (Token ID: ${tokenId})`);
      
      // Send notification
      await this.notificationService.sendTenantNotification(tenantId, {
        type: 'SYSTEM',
        title: 'Digital Pass Issued',
        message: `NFT-based digital pass issued for student ${pass.student.studentId}`,
        severity: 'INFO'
      });

      return digitalPass;

    } catch (error) {
      logger.error(`Failed to issue digital pass:`, error);
      
      // Record failed transaction
      await db.blockchainRecord.create({
        data: {
          tenantId,
          recordType: 'pass_issue',
          entityId: pass.id,
          blockchainTxHash: '',
          blockchainNetwork: this.configs.get(tenantId)?.network || 'ethereum',
          contractAddress: this.configs.get(tenantId)?.contractAddress || '',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          status: 'failed'
        }
      });

      throw new AppError('Failed to issue digital pass', 500);
    }
  }

  /**
   * Verify a digital pass on the blockchain
   */
  async verifyDigitalPass(
    tenantId: string,
    tokenId: string,
    db: PrismaClient
  ): Promise<VerificationResult> {
    try {
      const web3 = this.web3Instances.get(tenantId);
      const contract = this.contracts.get(tenantId);

      if (!web3 || !contract) {
        throw new AppError('Blockchain not configured for tenant', 404);
      }

      // Verify on blockchain
      const verificationResult = await contract.methods.verify(tokenId).call();
      
      if (!verificationResult.isValid) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: ['Pass not found or revoked on blockchain']
        };
      }

      // Get metadata
      const metadataUri = await contract.methods.tokenURI(tokenId).call();
      const metadata = await this.fetchMetadata(metadataUri);

      // Find corresponding pass in database
      const blockchainRecord = await db.blockchainRecord.findFirst({
        where: {
          tenantId,
          recordType: 'pass_issue',
          'metadata.tokenId': tokenId,
          status: 'confirmed'
        }
      });

      if (!blockchainRecord) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: ['Pass record not found in system']
        };
      }

      const pass = await db.pass.findUnique({
        where: { id: blockchainRecord.entityId },
        include: {
          student: {
            include: { school: true }
          }
        }
      });

      if (!pass) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: ['Pass not found in database']
        };
      }

      // Check if pass is still valid
      if (pass.status !== 'active') {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: [`Pass status: ${pass.status}`]
        };
      }

      if (pass.expiryDate < new Date()) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: ['Pass has expired']
        };
      }

      const digitalPass: DigitalPass = {
        id: pass.id,
        studentId: pass.studentId,
        issuerAddress: web3.eth.defaultAccount!,
        tokenId,
        metadata,
        issuedAt: pass.issueDate,
        expiresAt: pass.expiryDate,
        status: 'active'
      };

      logger.info(`Digital pass verified: ${pass.passNumber} (Token ID: ${tokenId})`);

      return {
        isValid: true,
        pass: digitalPass,
        blockchainTx: blockchainRecord.blockchainTxHash,
        verifiedAt: new Date()
      };

    } catch (error) {
      logger.error(`Failed to verify digital pass:`, error);
      return {
        isValid: false,
        verifiedAt: new Date(),
        errors: [error instanceof Error ? error.message : 'Verification failed']
      };
    }
  }

  /**
   * Revoke a digital pass on the blockchain
   */
  async revokeDigitalPass(
    tenantId: string,
    passId: string,
    reason: string,
    db: PrismaClient
  ): Promise<void> {
    try {
      const web3 = this.web3Instances.get(tenantId);
      const contract = this.contracts.get(tenantId);
      const config = this.configs.get(tenantId);

      if (!web3 || !contract || !config) {
        throw new AppError('Blockchain not configured for tenant', 404);
      }

      // Find the blockchain record
      const blockchainRecord = await db.blockchainRecord.findFirst({
        where: {
          tenantId,
          recordType: 'pass_issue',
          entityId: passId,
          status: 'confirmed'
        }
      });

      if (!blockchainRecord) {
        throw new AppError('Pass not found on blockchain', 404);
      }

      const tokenId = (blockchainRecord.metadata as any).tokenId;

      // Revoke on blockchain
      const revokeTx = await contract.methods.revoke(tokenId).send({
        from: web3.eth.defaultAccount,
        gas: config.gasLimit,
        gasPrice: config.gasPrice || await web3.eth.getGasPrice()
      });

      // Record revocation
      await db.blockchainRecord.create({
        data: {
          tenantId,
          recordType: 'pass_revoke',
          entityId: passId,
          blockchainTxHash: revokeTx.transactionHash,
          blockchainNetwork: config.network,
          contractAddress: config.contractAddress,
          metadata: {
            tokenId,
            reason
          },
          status: 'confirmed'
        }
      });

      logger.info(`Digital pass revoked: ${passId} (Token ID: ${tokenId})`);

      // Send notification
      await this.notificationService.sendTenantNotification(tenantId, {
        type: 'SYSTEM',
        title: 'Digital Pass Revoked',
        message: `NFT-based digital pass revoked for pass ${passId}. Reason: ${reason}`,
        severity: 'WARNING'
      });

    } catch (error) {
      logger.error(`Failed to revoke digital pass:`, error);
      throw new AppError('Failed to revoke digital pass', 500);
    }
  }

  /**
   * Batch issue digital passes
   */
  async batchIssueDigitalPasses(
    tenantId: string,
    passes: Array<{ pass: any; walletAddress: string }>,
    db: PrismaClient
  ): Promise<Array<{ passId: string; success: boolean; error?: string }>> {
    const results: Array<{ passId: string; success: boolean; error?: string }> = [];

    for (const { pass, walletAddress } of passes) {
      try {
        await this.issueDigitalPass(tenantId, pass, walletAddress, db);
        results.push({ passId: pass.id, success: true });
      } catch (error) {
        results.push({ 
          passId: pass.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Create decentralized identity (DID) for student
   */
  async createStudentDID(
    tenantId: string,
    studentId: string,
    attributes: Record<string, any>,
    db: PrismaClient
  ): Promise<string> {
    try {
      // Generate DID
      const did = `did:sps:${tenantId}:${studentId}`;
      
      // Create DID document
      const didDocument = {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        authentication: [
          {
            id: `${did}#key1`,
            type: 'Ed25519VerificationKey2018',
            controller: did,
            publicKeyBase58: this.generatePublicKey()
          }
        ],
        service: [
          {
            id: `${did}#studentpass`,
            type: 'StudentPassService',
            serviceEndpoint: `https://api.studentpass.com/v1/students/${studentId}`
          }
        ],
        attributes
      };

      // Store on blockchain or IPFS
      const documentHash = await this.storeDocument(didDocument);

      logger.info(`DID created for student ${studentId}: ${did}`);
      return did;

    } catch (error) {
      logger.error('Failed to create student DID:', error);
      throw new AppError('Failed to create decentralized identity', 500);
    }
  }

  /**
   * Cross-institution pass verification
   */
  async verifyPassCrossInstitution(
    originTenantId: string,
    targetTenantId: string,
    tokenId: string,
    db: PrismaClient
  ): Promise<VerificationResult> {
    try {
      // Verify with origin institution
      const originVerification = await this.verifyDigitalPass(originTenantId, tokenId, db);
      
      if (!originVerification.isValid) {
        return originVerification;
      }

      // Check cross-institution agreements
      const agreement = await this.checkCrossInstitutionAgreement(originTenantId, targetTenantId, db);
      
      if (!agreement) {
        return {
          isValid: false,
          verifiedAt: new Date(),
          errors: ['No agreement between institutions']
        };
      }

      // Record cross-institution verification
      await db.tenantAuditLog.create({
        data: {
          tenantId: targetTenantId,
          action: 'cross_institution_verification',
          resourceType: 'pass',
          resourceId: tokenId,
          metadata: {
            originTenant: originTenantId,
            verificationResult: originVerification
          }
        }
      });

      return {
        ...originVerification,
        verifiedAt: new Date()
      };

    } catch (error) {
      logger.error('Cross-institution verification failed:', error);
      return {
        isValid: false,
        verifiedAt: new Date(),
        errors: ['Cross-institution verification failed']
      };
    }
  }

  /**
   * Generate blockchain-based certificates
   */
  async generateCompletionCertificate(
    tenantId: string,
    studentId: string,
    courseId: string,
    grade: string,
    db: PrismaClient
  ): Promise<string> {
    try {
      const web3 = this.web3Instances.get(tenantId);
      const config = this.configs.get(tenantId);

      if (!web3 || !config) {
        throw new AppError('Blockchain not configured', 404);
      }

      // Create certificate metadata
      const certificate = {
        student: studentId,
        course: courseId,
        grade,
        issuedAt: new Date().toISOString(),
        issuer: tenantId
      };

      // Generate certificate hash
      const certificateHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(certificate))
        .digest('hex');

      // Store certificate on blockchain (simplified - would use actual certificate contract)
      logger.info(`Certificate generated for student ${studentId}: ${certificateHash}`);
      
      return certificateHash;

    } catch (error) {
      logger.error('Failed to generate certificate:', error);
      throw new AppError('Certificate generation failed', 500);
    }
  }

  // Private helper methods

  private generateTokenId(passId: string): number {
    return parseInt(crypto.createHash('md5').update(passId).digest('hex').substring(0, 8), 16);
  }

  private async uploadMetadata(metadata: any): Promise<string> {
    // This would integrate with IPFS or similar decentralized storage
    // For now, return a mock URI
    const hash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
    return `https://ipfs.studentpass.com/${hash}`;
  }

  private async fetchMetadata(uri: string): Promise<any> {
    // This would fetch from IPFS or similar
    // For now, return mock metadata
    return {
      name: 'Student Pass',
      description: 'Digital student pass',
      attributes: []
    };
  }

  private async storeDocument(document: any): Promise<string> {
    // Store document on IPFS or blockchain
    const hash = crypto.createHash('sha256').update(JSON.stringify(document)).digest('hex');
    return hash;
  }

  private generatePublicKey(): string {
    // Generate Ed25519 public key
    return crypto.randomBytes(32).toString('base64');
  }

  private async checkCrossInstitutionAgreement(
    originTenantId: string,
    targetTenantId: string,
    db: PrismaClient
  ): Promise<boolean> {
    // Check if institutions have agreements for pass recognition
    // This would be implemented based on business requirements
    return true; // Simplified for now
  }

  /**
   * Get blockchain network status
   */
  async getNetworkStatus(tenantId: string): Promise<any> {
    try {
      const web3 = this.web3Instances.get(tenantId);
      if (!web3) {
        throw new AppError('Blockchain not configured', 404);
      }

      const blockNumber = await web3.eth.getBlockNumber();
      const gasPrice = await web3.eth.getGasPrice();
      const networkId = await web3.eth.net.getId();

      return {
        connected: true,
        networkId,
        blockNumber,
        gasPrice,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to get network status:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Cleanup blockchain connections
   */
  async cleanup(): Promise<void> {
    this.web3Instances.clear();
    this.contracts.clear();
    this.configs.clear();
  }
}

// Singleton instance
let blockchainService: BlockchainService;

export const getBlockchainService = (): BlockchainService => {
  if (!blockchainService) {
    blockchainService = new BlockchainService();
  }
  return blockchainService;
};