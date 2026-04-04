from WorkTheard import WorkThread

work = WorkThread()

def main():
    results = work.queryDB("SELECT top 10 * FROM [Data_qad].[dbo].[Transaction History Browse (NRI)]")
    for row in results:
        print(row)

    print(type(results))




if __name__ == '__main__':
    main()
