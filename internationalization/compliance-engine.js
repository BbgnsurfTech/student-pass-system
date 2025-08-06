/**
 * Global Compliance Engine
 * Handles regional privacy laws and educational regulations
 */

class ComplianceEngine {
  constructor() {
    this.regulations = new Map();
    this.auditLog = [];
    this.initializeRegulations();
  }

  initializeRegulations() {
    // GDPR - European Union
    this.regulations.set('GDPR', {
      region: 'EU',
      applicableCountries: [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
      ],
      requirements: {
        cookieConsent: true,
        dataRetention: {
          max: 7 * 365, // 7 years
          deletionRequired: true
        },
        userRights: [
          'rightToAccess',
          'rightToRectification',
          'rightToErasure',
          'rightToPortability',
          'rightToObject',
          'rightToRestrict'
        ],
        dataProcessingBasis: [
          'consent',
          'contract',
          'legalObligation',
          'vitalInterests',
          'publicTask',
          'legitimateInterests'
        ],
        consentAge: 16,
        parentalConsent: true,
        dataProtectionOfficer: true,
        privacyByDesign: true,
        impactAssessment: true,
        breachNotification: 72 // hours
      },
      penalties: {
        max: '20M EUR or 4% annual turnover'
      }
    });

    // FERPA - United States Educational Records
    this.regulations.set('FERPA', {
      region: 'US',
      applicableCountries: ['US'],
      requirements: {
        educationalRecordsProtection: true,
        parentalConsent: {
          required: true,
          age: 18
        },
        directoryInformation: {
          optOut: true,
          categories: [
            'name',
            'address',
            'telephone',
            'email',
            'dateOfBirth',
            'enrollment',
            'participationActivities',
            'awards',
            'previousSchool'
          ]
        },
        disclosure: {
          written: true,
          exceptions: [
            'schoolOfficials',
            'otherSchools',
            'audit',
            'financialAid',
            'accreditingOrganizations',
            'compliance',
            'judicial',
            'emergency'
          ]
        },
        recordMaintenance: {
          disclosureLog: true,
          retention: 'indefinite'
        }
      }
    });

    // COPPA - Children's Online Privacy Protection Act
    this.regulations.set('COPPA', {
      region: 'US',
      applicableCountries: ['US'],
      requirements: {
        ageThreshold: 13,
        parentalConsent: {
          required: true,
          methods: [
            'creditCard',
            'digitalSignature',
            'videoConference',
            'telephoneCall',
            'email'
          ],
          verification: true
        },
        dataCollection: {
          limited: true,
          onlyNecessary: true
        },
        disclosure: {
          prohibited: true,
          exceptions: [
            'safety',
            'legalProcess',
            'website'
          ]
        },
        deletion: {
          rightToDelete: true,
          parentalRight: true
        }
      }
    });

    // CCPA - California Consumer Privacy Act
    this.regulations.set('CCPA', {
      region: 'California',
      applicableCountries: ['US'],
      applicableStates: ['CA'],
      requirements: {
        revenueThreshold: 25000000, // $25M
        consumerRights: [
          'rightToKnow',
          'rightToDelete',
          'rightToOptOut',
          'rightToNonDiscrimination'
        ],
        saleOptOut: true,
        dataCategories: [
          'identifiers',
          'personalInfo',
          'characteristics',
          'commercial',
          'biometric',
          'internetActivity',
          'geolocation',
          'sensory',
          'employment',
          'education',
          'inferences'
        ],
        businessPurposes: true,
        thirdPartyDisclosure: true,
        privacyPolicy: true
      }
    });

    // PIPL - Personal Information Protection Law (China)
    this.regulations.set('PIPL', {
      region: 'China',
      applicableCountries: ['CN'],
      requirements: {
        dataLocalization: true,
        crossBorderTransfer: {
          approval: true,
          adequacyDecision: true,
          standardContract: true
        },
        consentAge: 14,
        sensitiveData: {
          explicit: true,
          categories: [
            'biometric',
            'religious',
            'health',
            'financial',
            'location',
            'minors'
          ]
        },
        dataMinimization: true,
        purposeLimitation: true,
        transparency: true,
        security: true
      }
    });

    // LGPD - Lei Geral de Proteção de Dados (Brazil)
    this.regulations.set('LGPD', {
      region: 'Brazil',
      applicableCountries: ['BR'],
      requirements: {
        legalBasis: [
          'consent',
          'compliance',
          'publicAdministration',
          'research',
          'contract',
          'judicial',
          'protection',
          'creditProtection',
          'legitimateInterests'
        ],
        sensitiveData: {
          explicit: true,
          categories: [
            'racial',
            'ethnic',
            'religious',
            'philosophical',
            'political',
            'union',
            'health',
            'sexuality',
            'biometric',
            'genetic'
          ]
        },
        dataSubjectRights: [
          'confirmation',
          'access',
          'correction',
          'anonymization',
          'blocking',
          'elimination',
          'portability',
          'information'
        ],
        dataProtectionOfficer: true,
        impactAssessment: true,
        breachNotification: true
      }
    });
  }

  // Check compliance requirements for a specific region/country
  getComplianceRequirements(countryCode, age = null) {
    const applicableRegulations = [];

    for (const [name, regulation] of this.regulations) {
      if (this.isApplicable(regulation, countryCode)) {
        const requirements = this.processRequirements(regulation, age);
        applicableRegulations.push({
          name,
          regulation: requirements
        });
      }
    }

    return applicableRegulations;
  }

  isApplicable(regulation, countryCode) {
    return regulation.applicableCountries.includes(countryCode);
  }

  processRequirements(regulation, age) {
    const processed = { ...regulation };

    // Handle age-specific requirements
    if (age !== null) {
      if (regulation.requirements.consentAge && age < regulation.requirements.consentAge) {
        processed.parentalConsentRequired = true;
      }

      if (regulation.requirements.ageThreshold && age < regulation.requirements.ageThreshold) {
        processed.specialProtection = true;
      }
    }

    return processed;
  }

  // Validate data collection against compliance
  validateDataCollection(data, countryCode, age) {
    const regulations = this.getComplianceRequirements(countryCode, age);
    const violations = [];

    for (const { name, regulation } of regulations) {
      const regulationViolations = this.checkRegulationViolations(
        name,
        regulation,
        data
      );
      violations.push(...regulationViolations);
    }

    this.auditLog.push({
      timestamp: new Date(),
      action: 'dataValidation',
      countryCode,
      age,
      violations: violations.length,
      details: violations
    });

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  checkRegulationViolations(regulationName, regulation, data) {
    const violations = [];

    switch (regulationName) {
      case 'GDPR':
        violations.push(...this.checkGDPRViolations(regulation, data));
        break;
      case 'FERPA':
        violations.push(...this.checkFERPAViolations(regulation, data));
        break;
      case 'COPPA':
        violations.push(...this.checkCOPPAViolations(regulation, data));
        break;
      case 'CCPA':
        violations.push(...this.checkCCPAViolations(regulation, data));
        break;
    }

    return violations;
  }

  checkGDPRViolations(regulation, data) {
    const violations = [];

    // Check for sensitive data without explicit consent
    if (data.biometric && !data.explicitConsent?.biometric) {
      violations.push({
        type: 'GDPR_SENSITIVE_DATA',
        message: 'Biometric data requires explicit consent under GDPR'
      });
    }

    // Check data minimization
    const necessaryFields = ['name', 'studentId', 'class'];
    const collectedFields = Object.keys(data);
    const unnecessaryFields = collectedFields.filter(
      field => !necessaryFields.includes(field)
    );

    if (unnecessaryFields.length > 0) {
      violations.push({
        type: 'GDPR_DATA_MINIMIZATION',
        message: `Collecting unnecessary data: ${unnecessaryFields.join(', ')}`
      });
    }

    return violations;
  }

  checkFERPAViolations(regulation, data) {
    const violations = [];

    // Check for educational records disclosure
    if (data.grades && !data.parentalConsent && data.age < 18) {
      violations.push({
        type: 'FERPA_PARENTAL_CONSENT',
        message: 'Educational records require parental consent for minors'
      });
    }

    return violations;
  }

  checkCOPPAViolations(regulation, data) {
    const violations = [];

    if (data.age < 13) {
      if (!data.parentalConsent) {
        violations.push({
          type: 'COPPA_PARENTAL_CONSENT',
          message: 'Children under 13 require parental consent'
        });
      }

      // Check for excessive data collection
      const allowedFields = ['name', 'age', 'guardianContact'];
      const collectedFields = Object.keys(data);
      const excessiveFields = collectedFields.filter(
        field => !allowedFields.includes(field)
      );

      if (excessiveFields.length > 0) {
        violations.push({
          type: 'COPPA_EXCESSIVE_COLLECTION',
          message: `Excessive data collection for children: ${excessiveFields.join(', ')}`
        });
      }
    }

    return violations;
  }

  checkCCPAViolations(regulation, data) {
    const violations = [];

    // Check for sale opt-out
    if (data.saleData && !data.optOutProvided) {
      violations.push({
        type: 'CCPA_SALE_OPT_OUT',
        message: 'Must provide opt-out option for data sale'
      });
    }

    return violations;
  }

  // Generate compliance report
  generateComplianceReport(countryCode) {
    const regulations = this.getComplianceRequirements(countryCode);
    const auditEntries = this.auditLog.filter(
      entry => entry.countryCode === countryCode
    );

    return {
      country: countryCode,
      applicableRegulations: regulations.map(r => r.name),
      totalValidations: auditEntries.length,
      violations: auditEntries.reduce((sum, entry) => sum + entry.violations, 0),
      complianceScore: this.calculateComplianceScore(auditEntries),
      recommendations: this.generateRecommendations(regulations),
      lastAudit: auditEntries[auditEntries.length - 1]?.timestamp
    };
  }

  calculateComplianceScore(auditEntries) {
    if (auditEntries.length === 0) return 100;

    const totalViolations = auditEntries.reduce(
      (sum, entry) => sum + entry.violations,
      0
    );
    const totalValidations = auditEntries.length;

    return Math.max(0, 100 - (totalViolations / totalValidations) * 10);
  }

  generateRecommendations(regulations) {
    const recommendations = [];

    for (const { name, regulation } of regulations) {
      switch (name) {
        case 'GDPR':
          recommendations.push('Implement cookie consent banner');
          recommendations.push('Provide data export functionality');
          recommendations.push('Establish data retention policies');
          break;
        case 'FERPA':
          recommendations.push('Implement parental consent workflow');
          recommendations.push('Create educational records access controls');
          break;
        case 'COPPA':
          recommendations.push('Implement age verification');
          recommendations.push('Minimize data collection for children');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Export audit trail
  exportAuditTrail(format = 'json') {
    const data = {
      exportDate: new Date(),
      totalEntries: this.auditLog.length,
      entries: this.auditLog
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(this.auditLog);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'object' ? JSON.stringify(value) : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}

export default ComplianceEngine;