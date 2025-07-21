// ============================================================================
// 🔍 CRASH WORM 3D - ESLINT CONFIGURATION
// ============================================================================
// Ubicación: eslint.config.js
// Configuración moderna de ESLint para React, TypeScript y Game Development

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  // ========================================
  // 🌍 CONFIGURACIÓN GLOBAL
  // ========================================
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        
        // Node.js globals (para scripts de build)
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        
        // Game development globals
        THREE: 'readonly',
        CANNON: 'readonly',
        Tone: 'readonly',
        
        // Testing globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        
        // Build-time globals
        __DEV__: 'readonly',
        __PROD__: 'readonly',
        __BUILD_TIME__: 'readonly',
        __VERSION__: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
          modules: true
        }
      }
    }
  },

  // ========================================
  // 📁 ARCHIVOS A IGNORAR
  // ========================================
  {
    ignores: [
      // Build outputs
      'dist/**',
      'build/**',
      '.vite/**',
      'coverage/**',
      
      // Node modules
      'node_modules/**',
      
      // Config files
      'vite.config.js',
      'vitest.config.js',
      
      // Generated files
      'public/sw.js',
      'src/assets/generated/**',
      
      // Temporary files
      '**/*.tmp',
      '**/*.temp',
      
      // Legacy code (si existe)
      'src/legacy/**'
    ]
  },

  // ========================================
  // ⚛️ CONFIGURACIÓN PARA REACT/JSX
  // ========================================
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      security
    },
    rules: {
      // ========================================
      // 📋 REGLAS BÁSICAS DE JAVASCRIPT
      // ========================================
      ...js.configs.recommended.rules,
      
      // Variables
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'warn',
      
      // Funciones
      'no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      'prefer-arrow-callback': 'warn',
      'arrow-spacing': 'error',
      
      // Control de flujo
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'default-case': 'warn',
      'consistent-return': 'warn',
      
      // Calidad de código
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-lines': ['warn', 500],
      'max-params': ['warn', 5],
      
      // ========================================
      // ⚛️ REGLAS DE REACT
      // ========================================
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // No necesario con nuevo JSX transform
      'react/prop-types': 'off', // Usamos TypeScript para tipos
      'react/display-name': 'warn',
      'react/no-unused-prop-types': 'warn',
      'react/no-unused-state': 'warn',
      'react/prefer-stateless-function': 'warn',
      'react/self-closing-comp': 'error',
      'react/sort-comp': 'warn',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-pascal-case': 'error',
      'react/jsx-wrap-multilines': ['error', {
        declaration: 'parens-new-line',
        assignment: 'parens-new-line',
        return: 'parens-new-line',
        arrow: 'parens-new-line'
      }],
      'react/jsx-first-prop-new-line': ['error', 'multiline'],
      'react/jsx-closing-bracket-location': ['error', 'tag-aligned'],
      'react/jsx-closing-tag-location': 'error',
      'react/jsx-tag-spacing': 'error',
      
      // ========================================
      // 🪝 REGLAS DE REACT HOOKS
      // ========================================
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // ========================================
      // 🔄 REACT REFRESH
      // ========================================
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      
      // ========================================
      // ♿ ACCESIBILIDAD (JSX-A11Y)
      // ========================================
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      
      // ========================================
      // 📦 IMPORTS
      // ========================================
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index']
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'warn',
      'import/prefer-default-export': 'off', // Preferimos named exports
      
      // ========================================
      // 🔒 SEGURIDAD
      // ========================================
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-pseudoRandomBytes': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        alias: {
          map: [
            ['@', './src'],
            ['@components', './src/components'],
            ['@core', './src/core'],
            ['@hooks', './src/hooks'],
            ['@utils', './src/utils'],
            ['@styles', './src/styles'],
            ['@data', './src/data']
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
    }
  },

  // ========================================
  // 📘 CONFIGURACIÓN PARA TYPESCRIPT
  // ========================================
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // Desactivar reglas JS que conflictan con TS
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-shadow': 'off',
      
      // Reglas específicas de TypeScript
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'warn',
      
      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['camelCase']
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase']
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I']
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          suffix: ['Enum']
        }
      ]
    }
  },

  // ========================================
  // 🎮 REGLAS ESPECÍFICAS PARA GAME DEV
  // ========================================
  {
    files: ['src/core/**/*.{js,ts}', 'src/components/Game*.{jsx,tsx}'],
    rules: {
      // Permitir funciones más complejas en el motor del juego
      'complexity': ['warn', 20],
      'max-lines': ['warn', 800],
      'max-params': ['warn', 8],
      
      // Permitir algunos patrones comunes en game dev
      'no-bitwise': 'off', // Operaciones bitwise son comunes
      'no-plusplus': 'off', // Incrementos en loops
      'prefer-destructuring': 'off', // Performance en loops
      
      // Ser más estricto con memory leaks
      'react-hooks/exhaustive-deps': 'error'
    }
  },

  // ========================================
  // 🧪 REGLAS PARA ARCHIVOS DE TEST
  // ========================================
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Relajar algunas reglas para tests
      'max-lines': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      
      // Reglas específicas para testing
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error'
    }
  },

  // ========================================
  // ⚙️ ARCHIVOS DE CONFIGURACIÓN
  // ========================================
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
    rules: {
      // Permitir require en archivos de config
      '@typescript-eslint/no-var-requires': 'off',
      'import/no-extraneous-dependencies': 'off',
      
      // Permitir console en scripts
      'no-console': 'off'
    }
  },

  // ========================================
  // 🎨 REGLAS PARA ARCHIVOS DE ESTILO
  // ========================================
  {
    files: ['**/*.style.{js,ts}', '**/styles/**/*.{js,ts}'],
    rules: {
      // Permitir objetos grandes para definiciones de estilos
      'max-lines': 'off',
      'object-curly-newline': 'off'
    }
  }
];

// ========================================
// 💡 TIPS DE USO
// ========================================

/*
COMANDOS ÚTILES:

# Ejecutar linting
npm run lint

# Fix automático
npm run lint:fix

# Linting específico
npx eslint src/components/Player.jsx

# Linting con formato específico
npx eslint . --format=table

# Ignorar reglas específicas en archivo
// eslint-disable-next-line rule-name

# Ignorar reglas en bloque
/* eslint-disable rule-name */
// código
/* eslint-enable rule-name */

/*
INTEGRACIÓN CON EDITOR:

VS Code:
- Instalar extensión "ESLint"
- Configurar format on save

WebStorm:
- ESLint se detecta automáticamente
- Habilitar en Settings > Languages > JavaScript > Code Quality Tools

PERFORMANCE TIPS:

1. Usar .eslintcache para builds más rápidos
2. Configurar editor para linting incremental
3. Ejecutar solo en archivos modificados en CI
4. Usar eslint-plugin-import resolver para paths

GAME DEV SPECIFIC:

- Three.js objects pueden ser complejos (complexity rule relaxed)
- Performance loops pueden usar ++ (no-plusplus off)
- Bitwise operations permitidas para optimizaciones
- Memory management más estricto con hooks
*/