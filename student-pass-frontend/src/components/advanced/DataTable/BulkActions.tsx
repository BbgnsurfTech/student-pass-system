import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronDownIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { BouncyButton } from '../../common/DelightfulComponents';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  action: (selectedItems: any[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  confirmationRequired?: boolean;
  confirmationMessage?: string;
}

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  selectedData: any[];
  onDeselectAll: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  totalCount,
  actions,
  selectedData,
  onDeselectAll,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

  const handleActionClick = (action: BulkAction) => {
    if (action.confirmationRequired) {
      setPendingAction(action);
      setShowConfirmDialog(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action: BulkAction) => {
    action.action(selectedData);
    onDeselectAll();
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const getActionButtonClass = (variant?: string) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-800';
      case 'primary':
        return 'text-primary-600 hover:bg-primary-50 hover:text-primary-800';
      default:
        return 'text-gray-600 hover:bg-gray-50 hover:text-gray-800';
    }
  };

  return (
    <>
      <motion.div
        className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckIcon className="h-4 w-4 text-white" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-primary-900">
                  {selectedCount} of {totalCount} items selected
                </p>
                <p className="text-xs text-primary-600">
                  Perform actions on selected items
                </p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="w-32 h-2 bg-primary-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: 0 }}
                animate={{ width: `${(selectedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Bulk Actions Dropdown */}
            {actions.length > 0 && (
              <Menu as="div" className="relative">
                <Menu.Button as={React.Fragment}>
                  <BouncyButton className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    <span>Actions</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </BouncyButton>
                </Menu.Button>

                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10 divide-y divide-gray-100">
                    <div className="p-2">
                      {actions.map((action) => (
                        <Menu.Item key={action.id}>
                          {({ active }) => (
                            <motion.button
                              onClick={() => handleActionClick(action)}
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } ${getActionButtonClass(action.variant)} group flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {action.icon && (
                                <action.icon className="h-4 w-4 mr-3" />
                              )}
                              {action.label}
                            </motion.button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {/* Deselect All Button */}
            <motion.button
              onClick={onDeselectAll}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Deselect all"
            >
              <XMarkIcon className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Selection Summary */}
        {selectedCount > 5 && (
          <motion.div
            className="mt-3 pt-3 border-t border-primary-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between text-xs text-primary-600">
              <span>Large selection detected</span>
              <span>{((selectedCount / totalCount) * 100).toFixed(1)}% selected</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      <Transition appear show={showConfirmDialog} as={React.Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowConfirmDialog(false)}
        >
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 rounded-full ${
                      pendingAction?.variant === 'danger' 
                        ? 'bg-red-100' 
                        : 'bg-yellow-100'
                    }`}>
                      <ExclamationTriangleIcon className={`h-6 w-6 ${
                        pendingAction?.variant === 'danger'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-medium text-gray-900">
                        Confirm Action
                      </Dialog.Title>
                      <p className="text-sm text-gray-600">
                        This action will affect {selectedCount} items
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700">
                      {pendingAction?.confirmationMessage || 
                       `Are you sure you want to ${pendingAction?.label.toLowerCase()} the selected items?`}
                    </p>
                  </div>

                  <div className="flex space-x-3 justify-end">
                    <BouncyButton
                      onClick={() => setShowConfirmDialog(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </BouncyButton>
                    <BouncyButton
                      onClick={() => pendingAction && executeAction(pendingAction)}
                      className={`px-4 py-2 rounded-md text-white ${
                        pendingAction?.variant === 'danger'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {pendingAction?.label}
                    </BouncyButton>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};