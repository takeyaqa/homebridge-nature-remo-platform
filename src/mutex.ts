export class Mutex {
  private tasks: (() => void)[] = [];
  private isLocked = false;

  acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve(() => {
          this.isLocked = false;
          if (this.tasks.length > 0) {
            const next = this.tasks.shift();
            if (next === undefined) {
              reject(new Error());
              return;
            }
            next();
          }
        });
      } else {
        const task = () => {
          resolve(() => {
            this.isLocked = false;
            if (this.tasks.length > 0) {
              const next = this.tasks.shift();
              if (next === undefined) {
                reject(new Error());
                return;
              }
              next();
            }
          });
        };
        this.tasks.push(task);
      }
    });
  }
}
