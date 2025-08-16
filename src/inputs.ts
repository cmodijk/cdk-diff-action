/**
 * Inputs to the GH Workflow
 */
export interface Inputs {
  /**
   * The GitHub TOKEN to use to create the comment
   */
  githubToken: string;

  /**
   * List of stack selector patterns
   *
   * @default - show diff for all stages
   */
  stackSelectorPatterns: string[];

  /**
   * Used in combination with 'stackSelectorPatterns' to control which stacks to diff.
   *
   * Valid values are 'all-stacks', 'main-assembly', 'only-single', 'pattern-match',
   * 'pattern-must-match', 'pattern-must-match-single'
   *
   * @see https://github.com/aws/aws-cdk-cli/tree/main/packages/%40aws-cdk/toolkit-lib#stack-selection
   * @default pattern-must-match if 'stackSelectorPatterns is provided, otherwise 'all-stacks'
   */
  stackSelectionStrategy: string;

  /**
   * The method to create a stack diff.
   *
   * Valid values are `change-set` or `template-only`.
   *
   * Use changeset diff for the highest fidelity, including analyze resource replacements.
   * In this method, diff will use the deploy role instead of the lookup role.
   *
   * Use template-only diff for a faster, less accurate diff that doesn't require
   * permissions to create a change-set.
   *
   * @default 'change-set'
   */
  diffMethod: string;

  /**
   * Git reference to compare against for detecting changes
   *
   * @default 'origin/main'
   */
  baseRef: string;

  /**
   * An optional title for each diff comment on the PR.
   *
   * @default - no title
   */
  title?: string;
}
