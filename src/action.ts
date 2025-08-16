import {
  getInput,
  getMultilineInput,
  debug,
} from '@actions/core';
import * as github from '@actions/github';
import {
  DiffMethod,
  NonInteractiveIoHost,
  Toolkit,
} from '@aws-cdk/toolkit-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import glob from 'fast-glob';
import { Comments } from './comment';
import { Inputs } from './inputs';
import { AssemblyProcessor } from './stage-processor';

/**
 * Expand glob pattern to actual CDK output directories
 */
async function expandCdkDirectories(pattern: string): Promise<string[]> {
  debug(`Processing glob pattern: ${pattern}`);
  
  const matches = await glob(pattern, { onlyDirectories: true });
  const directories = matches.filter(match => 
    fs.existsSync(match) && fs.statSync(match).isDirectory()
  );
  
  debug(`Found directories: ${JSON.stringify(directories)}`);
  return directories;
}

/**
 * Check if a directory has changes in the current PR/git diff
 */
function hasGitChanges(directory: string, baseRef: string): boolean {
  try {
    // Get the parent directory (e.g., from "infra/common/cdk.out" get "infra/common/")
    const projectDir = path.dirname(directory);
    
    debug(`Checking git changes in directory: ${projectDir} against ${baseRef}`);
    
    const result = child_process.execSync(
      `git diff --name-only ${baseRef}...HEAD -- "${projectDir}/"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const hasChanges = result.trim().length > 0;
    debug(`Directory ${projectDir} has changes against ${baseRef}: ${hasChanges}`);
    
    // Always show git diff output for debugging purposes
    debug(`Git diff output for ${projectDir}:\n${result || '(no changes)'}`);
    
    return hasChanges;
  } catch (error) {
    debug(`Error checking git changes for ${directory} against ${baseRef}: ${error}`);
    // If git command fails, assume there are changes to be safe
    return true;
  }
}

/**
 * Filter directories to only include those with git changes
 */
function filterDirectoriesWithChanges(directories: string[], baseRef: string): string[] {
  const filteredDirectories = directories.filter(dir => hasGitChanges(dir, baseRef));
  
  debug(`Filtered ${directories.length} directories to ${filteredDirectories.length} with changes against ${baseRef}`);
  debug(`Directories with changes: ${JSON.stringify(filteredDirectories)}`);
  
  return filteredDirectories;
}

export async function run() {
  const cdkOutDirsInput = getInput('cdkOutDirs');
  const baseRefInput = getInput('baseRef');
  
  const inputPattern = cdkOutDirsInput || '**/cdk.out';
  const baseRef = baseRefInput || 'origin/main';

  // Expand glob pattern to actual directories
  const allCdkOutDirs = await expandCdkDirectories(inputPattern);
  
  if (allCdkOutDirs.length === 0) {
    throw new Error(`No CDK output directories found for pattern: ${inputPattern}`);
  }

  // Filter to only directories with git changes
  const cdkOutDirs = filterDirectoriesWithChanges(allCdkOutDirs, baseRef);
  
  if (cdkOutDirs.length === 0) {
    debug('No directories have changes in this PR, skipping CDK diff');
    return;
  }

  const inputs: Inputs = {
    title: getInput('title') || undefined,
    githubToken: getInput('githubToken'),
    stackSelectorPatterns: getMultilineInput('stackSelectorPatterns'),
    stackSelectionStrategy: getInput('stackSelectionStrategy', {
      required: true,
    }),
    baseRef: baseRef,
    diffMethod: getInput('diffMethod', { required: true }),
  };

  if (
    inputs.stackSelectorPatterns.length > 0 &&
    inputs.stackSelectionStrategy === 'all-stacks'
  ) {
    inputs.stackSelectionStrategy = 'pattern-must-match';
  }

  debug(`Inputs: ${JSON.stringify(inputs, null, 2)}`);

  const octokit = github.getOctokit(inputs.githubToken);
  const context = github.context;

  const toolkit = new Toolkit({
    ioHost: new NonInteractiveIoHost({
      logLevel: 'trace',
    }),
  });
  const method =
    inputs.diffMethod === 'template-only'
      ? DiffMethod.TemplateOnly()
      : DiffMethod.ChangeSet();
  try {
    const comments = new Comments(octokit, context);

    for (const cdkOutDir of cdkOutDirs) {
      debug(`Processing CDK output directory: ${cdkOutDir}`);
      const processor = new AssemblyProcessor({
        ...inputs,
        cdkOutDir,
        diffMethod: method,
        toolkit,
      });
      try {
        await processor.processStages();
      } catch (e: any) {
        console.error(`Error running process stages for ${cdkOutDir}: `, e);
        throw e;
      }

      try {
        await processor.commentStages(comments);
      } catch (e: any) {
        console.error(`Error commenting stages for ${cdkOutDir}: `, e);
        throw e;
      }
    }
  } catch (e: any) {
    console.error('Error performing diff: ', e);
    throw e;
  }
  return;
}
