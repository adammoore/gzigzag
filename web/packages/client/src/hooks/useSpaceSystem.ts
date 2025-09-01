import { useEffect, useState } from 'react';
import { ZZSpace } from '@zigzag/core';

export interface SpaceSystemConfig {
  availableDimensions: string[];
  availableViews: string[];
  availableActions: string[];
  currentBindings: string[];
}

/**
 * Hook to read the space's system configuration from the HOME cell structure
 * This implements the authentic GZZ pattern where the system reads dimensions,
 * views, actions, and bindings from the d.2 list structure starting from HOME
 */
export const useSpaceSystem = (space: ZZSpace | null): SpaceSystemConfig => {
  const [config, setConfig] = useState<SpaceSystemConfig>({
    availableDimensions: ['d.1', 'd.2', 'd.3'], // Default fallback
    availableViews: ['vanishing', 'stretchvanishing', 'row', 'column', 'rank'],
    availableActions: ['edit', 'mark', 'connect', 'break', 'hop'],
    currentBindings: ['normal']
  });

  useEffect(() => {
    if (!space) return;

    try {
      const homeCell = space.getHomeCell();
      if (!homeCell) return;

      // Navigate the HOME -> d.2 list structure
      const dimListsLabel = homeCell.step('d.2', 1);
      if (!dimListsLabel || dimListsLabel.text !== 'DimLists') {
        // Fallback to registered dimensions if structure not found
        setConfig(prev => ({
          ...prev,
          availableDimensions: space.getDimensions()
        }));
        return;
      }

      // Read dimensions
      const dimensionsList = dimListsLabel.step('d.1', 1);
      if (dimensionsList) {
        const dimensions: string[] = [];
        let dimCell = dimensionsList.step('d.2', 1);
        while (dimCell) {
          if (dimCell.text && dimCell.text.trim()) {
            dimensions.push(dimCell.text.trim());
          }
          dimCell = dimCell.step('d.2', 1);
        }
        
        // Read actions
        const actionsLabel = dimListsLabel.step('d.2', 1);
        let actions: string[] = [];
        if (actionsLabel && actionsLabel.text === 'Actions') {
          const actionsList = actionsLabel.step('d.1', 1);
          if (actionsList) {
            let actionCell = actionsList.step('d.2', 1);
            while (actionCell) {
              if (actionCell.text && actionCell.text.trim()) {
                actions.push(actionCell.text.trim());
              }
              actionCell = actionCell.step('d.2', 1);
            }
          }
        }

        // Read views
        const viewsLabel = actionsLabel?.step('d.2', 1);
        let views: string[] = [];
        if (viewsLabel && viewsLabel.text === 'Views') {
          const viewsList = viewsLabel.step('d.1', 1);
          if (viewsList) {
            let viewCell = viewsList.step('d.2', 1);
            while (viewCell) {
              if (viewCell.text && viewCell.text.trim()) {
                const viewName = viewCell.text.trim().toLowerCase();
                // Map original GZZ view names to our implementation
                switch (viewName) {
                  case 'vanishing':
                    views.push('vanishing');
                    break;
                  case 'stretchvanishing':
                    views.push('stretchvanishing');
                    break;
                  case 'row':
                    views.push('row');
                    break;
                  case 'column':
                    views.push('column');
                    break;
                  case 'rank':
                    views.push('rank');
                    break;
                  default:
                    // Try to match by lowercase for flexibility
                    const lowercaseName = viewName.toLowerCase();
                    if (lowercaseName.includes('vanish') && lowercaseName.includes('stretch')) {
                      views.push('stretchvanishing');
                    } else if (lowercaseName.includes('vanish')) {
                      views.push('vanishing');
                    } else {
                      views.push(viewName as any);
                    }
                }
              }
              viewCell = viewCell.step('d.2', 1);
            }
          }
        }

        // Read bindings
        const bindingsLabel = viewsLabel?.step('d.2', 1);
        let bindings: string[] = [];
        if (bindingsLabel && bindingsLabel.text === 'Bindings') {
          const bindingsList = bindingsLabel.step('d.1', 1);
          if (bindingsList) {
            if (bindingsList.text && bindingsList.text.trim()) {
              bindings.push(bindingsList.text.trim());
            }
            let bindingCell = bindingsList.step('d.2', 1);
            while (bindingCell) {
              if (bindingCell.text && bindingCell.text.trim()) {
                bindings.push(bindingCell.text.trim());
              }
              bindingCell = bindingCell.step('d.2', 1);
            }
          }
        }

        setConfig({
          availableDimensions: dimensions.length > 0 ? dimensions : space.getDimensions(),
          availableViews: views.length > 0 ? views : ['vanishing', 'stretchvanishing', 'row', 'column', 'rank'],
          availableActions: actions.length > 0 ? actions : ['edit', 'mark', 'connect', 'break', 'hop'],
          currentBindings: bindings.length > 0 ? bindings : ['normal']
        });

      } else {
        // Fallback if dimension list structure is not found
        setConfig(prev => ({
          ...prev,
          availableDimensions: space.getDimensions()
        }));
      }

    } catch (error) {
      console.warn('Failed to read space system configuration:', error);
      // Use fallback configuration
    }
  }, [space]);

  return config;
};

/**
 * Hook to manage system cell editing
 * Allows users to modify the space configuration by editing system cells
 */
export const useSystemEditor = (space: ZZSpace | null) => {
  const addDimension = (dimensionName: string) => {
    if (!space) return false;

    try {
      const homeCell = space.getHomeCell();
      const dimListsLabel = homeCell.step('d.2', 1);
      if (!dimListsLabel) return false;

      const dimensionsList = dimListsLabel.step('d.1', 1);
      if (!dimensionsList) return false;

      // Find the last dimension cell
      let lastDimCell = dimensionsList.step('d.2', 1);
      while (lastDimCell && lastDimCell.step('d.2', 1)) {
        lastDimCell = lastDimCell.step('d.2', 1);
      }

      // Create new dimension cell
      const newDimCell = space.createCell(dimensionName);
      if (lastDimCell) {
        lastDimCell.connect('d.2', newDimCell);
      } else {
        dimensionsList.connect('d.2', newDimCell);
      }

      // Register the dimension in the space
      space.registerDimension(dimensionName);
      
      return true;
    } catch (error) {
      console.warn('Failed to add dimension:', error);
      return false;
    }
  };

  const addView = (viewName: string) => {
    if (!space) return false;

    try {
      const homeCell = space.getHomeCell();
      const dimListsLabel = homeCell.step('d.2', 1);
      if (!dimListsLabel) return false;

      const actionsLabel = dimListsLabel.step('d.2', 1);
      if (!actionsLabel) return false;

      const viewsLabel = actionsLabel.step('d.2', 1);
      if (!viewsLabel) return false;

      const viewsList = viewsLabel.step('d.1', 1);
      if (!viewsList) return false;

      // Find the last view cell
      let lastViewCell = viewsList.step('d.2', 1);
      while (lastViewCell && lastViewCell.step('d.2', 1)) {
        lastViewCell = lastViewCell.step('d.2', 1);
      }

      // Create new view cell
      const newViewCell = space.createCell(viewName);
      if (lastViewCell) {
        lastViewCell.connect('d.2', newViewCell);
      } else {
        viewsList.connect('d.2', newViewCell);
      }

      return true;
    } catch (error) {
      console.warn('Failed to add view:', error);
      return false;
    }
  };

  return {
    addDimension,
    addView
  };
};

export default useSpaceSystem;