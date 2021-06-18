declare module '@nodutilus/fs' {

  import { PathLike, Dirent } from 'fs'

  /**
   * Выполняет обработку подкаталогов и файлов, найденных в результате обхода указанного каталога.
   * Если для подкаталога возвращается false, его содержимое проигнорируется
   */
  interface Walker {
    (
      /**
       * Путь до найденного подкаталога или файла,
       * включая каталог (path) переданный в вызов функции walk в формате posix
       */
      path: PathLike,
      /** Представление записи подкаталога или файла */
      dirent: Dirent
    ): void | boolean | Promise<void | boolean>
  }

  /**
   * Регулярное выражение или набор выражений, используемое для поиска совпадений в пути до каталога или файла.
   * Переданные сроки будут преобразованы через конструктор new RegExp(<string>).
   * В качестве разделителя пути необходимо использовать '/'
   * @example
   * // Варианты для поиска файлов расширением `.log` c числовым именем в каталоге `home`
   * ['/home/.+\\d+.log$', String.raw`/home/.+\d+.log$`, /\/home\/.+\d+.log$/]
   */
  type SearchingRegExp = Array<RegExp | string> | RegExp | string


  /** Базовые опции поиска в каталоге */
  interface SearchingOptions {
    /**
     * Регулярное выражение (или набор выражений) для поиска совпадений пути при обходе.
     * Позволит вернуть в выдачу результатов только соответствующие условиям каталоги и файлы.
     * При этом обход дерева все равно выполняется для всех подкаталогов и файлов, но возвращаются только соответствующие условиям поиска.
     * Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
     */
    include?: SearchingRegExp
    /**
     * Регулярное выражение (или набор выражений) для исключения из обхода совпадающего пути.
     * Позволит исключить из обхода дерева и выдачи результатов каталоги и файлы соответствующие условиям.
     * Если часть пути совпадает с условиями, то все вложенные каталоги и файлы будут проигнорированы при обходе дерева.
     * Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
     */
    exclude?: SearchingRegExp
  }

  /** Опции управления обходом дерева каталога */
  interface WalkOptions extends SearchingOptions {
    /** Обработчик результатов обхода дерева каталога */
    walker?: Walker
  }

  interface InnerWalkOptions extends WalkOptions {
    /** Префикс для унификации относительного пути (всегда начинается с ./) к файлу или каталогу */
    prefix: string
  }

  /** Нормализует регулярное выражение или набор выражений */
  interface NormalizeSearchingRegExp {
    (
      /** Исходное регулярное выражение или набор выражений */
      sRegExp: SearchingRegExp
    ): SearchingRegExp
  }

  /**
   * Проверяет путь до каталога или файла на соответствие выражению для поиска.
   * Вернет true - если хотя бы одно из выражений поиска совпадает с путем
   */
  interface SearchPathByRegExp {
    (
      /** Регулярное выражение или набор выражений для сопоставления */
      sRegExp: SearchingRegExp,
      /** Путь до каталога или файла для проверки соответствия условиям отбора */
      path: string
    ): boolean
  }

  type WalkGenerator = AsyncGenerator<[string, Dirent], [string, Dirent], boolean | void>

  interface WalkGeneratorFunction {
    (
      /** Текущий каталог для обхода */
      path: string,
      /** Внутренние опции для обхода дерева каталога */
      options: InnerWalkOptions
    ): WalkGenerator
  }

  interface WalkFunctionCommon {
    (path: string, options?: WalkOptions, walker?: Walker): Promise<void> | WalkGenerator
  }

  interface WalkFunction extends WalkFunctionCommon {
    /**
     * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Опции управления обходом дерева каталога */
      options: WalkOptions,
      /** Обработчик результатов обхода дерева каталога */
      walker: Walker
    ): Promise<void>
    /**
     * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Обработчик результатов обхода дерева каталога */
      walker: Walker
    ): Promise<void>
    /**
     * Возвращает итератор для рекурсивного обхода подкаталогов и файлов
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Опции управления обходом дерева каталога */
      options: WalkOptions
    ): WalkGenerator
    /**
     * Возвращает итератор для рекурсивного обхода подкаталогов и файлов
     */
    (
      /** Каталог для обхода */
      path: string
    ): WalkGenerator
  }

  /**
   * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker.
   * Если не передан Walker, то возвращает итератор для рекурсивного обхода подкаталогов и файлов
   */
  export const walk: WalkFunction

}
