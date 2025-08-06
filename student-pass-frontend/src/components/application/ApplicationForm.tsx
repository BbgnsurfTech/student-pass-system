import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { FileUpload } from './FileUpload';
import { UploadedFile } from '../../services/fileService';

const applicationSchema = z.object({
  passType: z.enum(['TEMPORARY', 'PERMANENT', 'VISITOR']),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  validFrom: z.string().min(1, 'Start date is required'),
  validTo: z.string().min(1, 'End date is required'),
  emergencyContact: z.string().min(10, 'Emergency contact is required'),
  emergencyPhone: z.string().regex(/^\+?[\d\s-()]{10,}$/, 'Valid phone number required'),
  additionalInfo: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData & { documents: UploadedFile[] }) => void;
  isLoading?: boolean;
}

const steps = [
  { id: 1, name: 'Pass Details', icon: DocumentTextIcon },
  { id: 2, name: 'Documents', icon: PhotoIcon },
  { id: 3, name: 'Review', icon: CheckCircleIcon },
];

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ onSubmit, isLoading = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    mode: 'onChange'
  });

  const formData = watch();

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof ApplicationFormData)[] => {
    switch (step) {
      case 1:
        return ['passType', 'purpose', 'validFrom', 'validTo'];
      case 2:
        return ['emergencyContact', 'emergencyPhone'];
      default:
        return [];
    }
  };

  const handleFormSubmit = (data: ApplicationFormData) => {
    onSubmit({ ...data, documents: uploadedDocuments });
  };

  const passTypeOptions = [
    { value: 'TEMPORARY', label: 'Temporary Pass', description: 'Valid for specific duration' },
    { value: 'PERMANENT', label: 'Permanent Pass', description: 'Valid for entire academic year' },
    { value: 'VISITOR', label: 'Visitor Pass', description: 'For guests and temporary visitors' },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-gray-300 bg-white text-gray-500'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-12 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Pass Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pass Details</h3>
                
                {/* Pass Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pass Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {passTypeOptions.map((option) => (
                      <label key={option.value} className="relative">
                        <input
                          type="radio"
                          value={option.value}
                          {...register('passType')}
                          className="sr-only peer"
                        />
                        <div className="p-4 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-gray-400">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500 mt-1">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.passType && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.passType.message}
                    </p>
                  )}
                </div>

                {/* Purpose */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose
                  </label>
                  <textarea
                    {...register('purpose')}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please describe the purpose of your pass application..."
                  />
                  {errors.purpose && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.purpose.message}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid From
                    </label>
                    <input
                      type="date"
                      {...register('validFrom')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.validFrom && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        {errors.validFrom.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid To
                    </label>
                    <input
                      type="date"
                      {...register('validTo')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.validTo && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        {errors.validTo.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Documents */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents & Emergency Contact</h3>
              
              {/* Emergency Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    {...register('emergencyContact')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                  {errors.emergencyContact && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.emergencyContact.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    {...register('emergencyPhone')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                  {errors.emergencyPhone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.emergencyPhone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Upload relevant documents such as ID, medical certificates, or authorization letters.
                </p>
                <FileUpload
                  onFilesUploaded={setUploadedDocuments}
                  maxFiles={5}
                  acceptedTypes={['image/*', '.pdf', '.doc', '.docx']}
                />
              </div>

              {/* Additional Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information (Optional)
                </label>
                <textarea
                  {...register('additionalInfo')}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information that might be relevant..."
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Application</h3>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Pass Type:</span>
                    <p className="text-gray-900">{formData.passType}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Duration:</span>
                    <p className="text-gray-900">{formData.validFrom} to {formData.validTo}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Purpose:</span>
                  <p className="text-gray-900">{formData.purpose}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Emergency Contact:</span>
                    <p className="text-gray-900">{formData.emergencyContact}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Emergency Phone:</span>
                    <p className="text-gray-900">{formData.emergencyPhone}</p>
                  </div>
                </div>
                
                {uploadedDocuments.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Documents:</span>
                    <ul className="mt-2 space-y-1">
                      {uploadedDocuments.map((doc) => (
                        <li key={doc.id} className="text-sm text-gray-700 flex items-center">
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          {doc.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {formData.additionalInfo && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Additional Information:</span>
                    <p className="text-gray-900">{formData.additionalInfo}</p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Please review your application carefully</p>
                    <p>Once submitted, you cannot modify the application. Make sure all information is accurate.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Previous
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Next
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};